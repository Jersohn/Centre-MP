-- =============================================================================
-- Helpers RLS (schéma privé) + politiques
-- =============================================================================

-- Profil courant (SECURITY DEFINER, lecture contrôlée)
create or replace function app_private.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.*
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function app_private.current_profile() from public, anon, authenticated;
grant execute on function app_private.current_profile() to authenticated, service_role;

create or replace function app_private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'actif'
      and p.role in ('admin', 'centre', 'chapitre', 'district', 'groupe')
  );
$$;

revoke all on function app_private.is_active_staff() from public, anon, authenticated;
grant execute on function app_private.is_active_staff() to authenticated, service_role;

create or replace function app_private.has_role(allowed public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'actif'
      and p.role = any (allowed)
  );
$$;

revoke all on function app_private.has_role(public.app_role[]) from public, anon, authenticated;
grant execute on function app_private.has_role(public.app_role[]) to authenticated, service_role;

create or replace function app_private.can_access_org(
  p_chapitre_id uuid,
  p_district_id uuid,
  p_groupe_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  me public.profiles;
begin
  select * into me from app_private.current_profile();
  if me.id is null or me.status <> 'actif' then
    return false;
  end if;

  if me.role in ('admin', 'centre') then
    return true;
  end if;

  if me.role = 'chapitre' then
    return me.chapitre_id is not null and me.chapitre_id = p_chapitre_id;
  end if;

  if me.role = 'district' then
    return me.district_id is not null
      and me.chapitre_id = p_chapitre_id
      and me.district_id = p_district_id;
  end if;

  if me.role = 'groupe' then
    return me.groupe_id is not null
      and me.chapitre_id = p_chapitre_id
      and me.district_id = p_district_id
      and me.groupe_id = p_groupe_id;
  end if;

  return false;
end;
$$;

revoke all on function app_private.can_access_org(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function app_private.can_access_org(uuid, uuid, uuid) to authenticated, service_role;

-- Exposition contrôlée pour le client (sans fuite de logique privée)
create or replace function public.my_profile()
returns public.profiles
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select * from public.profiles where id = auth.uid();
$$;

grant execute on function public.my_profile() to authenticated;

-- Sync app_metadata.role (pour JWT) — ne jamais utiliser user_metadata
create or replace function app_private.sync_profile_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'role', new.role::text,
      'status', new.status::text,
      'chapitre_id', new.chapitre_id,
      'district_id', new.district_id,
      'groupe_id', new.groupe_id
    )
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_app_metadata on public.profiles;
create trigger trg_sync_profile_app_metadata
after insert or update of role, status, chapitre_id, district_id, groupe_id
on public.profiles
for each row execute function app_private.sync_profile_app_metadata();

-- Création profil minimale à l'inscription (rôle en_attente / groupe par défaut)
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@users.local'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'groupe',
    'en_attente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.chapitres enable row level security;
alter table public.districts enable row level security;
alter table public.groupes enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.collectes enable row level security;
alter table public.zaimu_campaigns enable row level security;
alter table public.zaimu_quota_assignments enable row level security;
alter table public.landing_content enable row level security;

-- Org: lecture pour staff actif ; écriture admin/centre
drop policy if exists chapitres_select on public.chapitres;
create policy chapitres_select on public.chapitres
  for select to authenticated
  using (app_private.is_active_staff() or app_private.has_role(array['admin','centre']::public.app_role[]));

-- Public peut lire la structure org (site / formulaires) — données non sensibles
drop policy if exists chapitres_select_anon on public.chapitres;
create policy chapitres_select_anon on public.chapitres
  for select to anon
  using (true);

drop policy if exists chapitres_write on public.chapitres;
create policy chapitres_write on public.chapitres
  for all to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]))
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));

drop policy if exists districts_select on public.districts;
create policy districts_select on public.districts
  for select to anon, authenticated
  using (true);

drop policy if exists districts_write on public.districts;
create policy districts_write on public.districts
  for all to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]))
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));

drop policy if exists groupes_select on public.groupes;
create policy groupes_select on public.groupes
  for select to anon, authenticated
  using (true);

drop policy if exists groupes_write on public.groupes;
create policy groupes_write on public.groupes
  for all to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]))
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));

-- Profiles
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or app_private.has_role(array['admin','centre']::public.app_role[])
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- un utilisateur ne peut pas s'auto-promouvoir
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
    and chapitre_id is not distinct from (select p.chapitre_id from public.profiles p where p.id = auth.uid())
    and district_id is not distinct from (select p.district_id from public.profiles p where p.id = auth.uid())
    and groupe_id is not distinct from (select p.groupe_id from public.profiles p where p.id = auth.uid())
  );

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (app_private.has_role(array['admin']::public.app_role[]))
  with check (app_private.has_role(array['admin']::public.app_role[]));

-- Members — scoped
drop policy if exists members_select_scoped on public.members;
create policy members_select_scoped on public.members
  for select to authenticated
  using (app_private.can_access_org(chapitre_id, district_id, groupe_id));

drop policy if exists members_insert_scoped on public.members;
create policy members_insert_scoped on public.members
  for insert to authenticated
  with check (
    app_private.can_access_org(chapitre_id, district_id, groupe_id)
    and app_private.has_role(array['admin','centre','chapitre','district','groupe']::public.app_role[])
  );

drop policy if exists members_update_scoped on public.members;
create policy members_update_scoped on public.members
  for update to authenticated
  using (app_private.can_access_org(chapitre_id, district_id, groupe_id))
  with check (app_private.can_access_org(chapitre_id, district_id, groupe_id));

drop policy if exists members_delete_admin_centre on public.members;
create policy members_delete_admin_centre on public.members
  for delete to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]));

-- Collectes — scoped ; validation limitée admin/centre/chapitre
drop policy if exists collectes_select_scoped on public.collectes;
create policy collectes_select_scoped on public.collectes
  for select to authenticated
  using (app_private.can_access_org(chapitre_id, district_id, groupe_id));

drop policy if exists collectes_insert_scoped on public.collectes;
create policy collectes_insert_scoped on public.collectes
  for insert to authenticated
  with check (app_private.can_access_org(chapitre_id, district_id, groupe_id));

drop policy if exists collectes_update_scoped on public.collectes;
create policy collectes_update_scoped on public.collectes
  for update to authenticated
  using (app_private.can_access_org(chapitre_id, district_id, groupe_id))
  with check (app_private.can_access_org(chapitre_id, district_id, groupe_id));

drop policy if exists collectes_delete_elevated on public.collectes;
create policy collectes_delete_elevated on public.collectes
  for delete to authenticated
  using (app_private.has_role(array['admin','centre','chapitre']::public.app_role[]));

-- Quotas
drop policy if exists zaimu_campaigns_select on public.zaimu_campaigns;
create policy zaimu_campaigns_select on public.zaimu_campaigns
  for select to authenticated
  using (app_private.is_active_staff());

drop policy if exists zaimu_campaigns_write on public.zaimu_campaigns;
create policy zaimu_campaigns_write on public.zaimu_campaigns
  for all to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]))
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));

drop policy if exists zaimu_quota_select on public.zaimu_quota_assignments;
create policy zaimu_quota_select on public.zaimu_quota_assignments
  for select to authenticated
  using (
    level = 'centre' and app_private.is_active_staff()
    or (
      chapitre_id is not null
      and app_private.can_access_org(chapitre_id, district_id, groupe_id)
    )
  );

drop policy if exists zaimu_quota_write on public.zaimu_quota_assignments;
create policy zaimu_quota_write on public.zaimu_quota_assignments
  for all to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]))
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));

-- Landing : lecture publique, écriture admin/centre
drop policy if exists landing_content_select_public on public.landing_content;
create policy landing_content_select_public on public.landing_content
  for select to anon, authenticated
  using (true);

drop policy if exists landing_content_write_staff on public.landing_content;
create policy landing_content_write_staff on public.landing_content
  for insert to authenticated
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));

drop policy if exists landing_content_update_staff on public.landing_content;
create policy landing_content_update_staff on public.landing_content
  for update to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]))
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));

drop policy if exists landing_content_delete_admin on public.landing_content;
create policy landing_content_delete_admin on public.landing_content
  for delete to authenticated
  using (app_private.has_role(array['admin']::public.app_role[]));
