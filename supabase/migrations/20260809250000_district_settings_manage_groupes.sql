-- Paramètres pour le responsable district : gestion des responsables de groupe de son district.

insert into public.role_module_access (role, module_key, allowed) values
  ('district', 'settings', true),
  ('chapitre', 'settings', true),
  ('admin', 'settings', true),
  ('centre', 'settings', true)
on conflict (role, module_key) do update
set allowed = excluded.allowed;

update public.role_module_access
set allowed = false
where module_key = 'settings'
  and role = 'groupe';

-- Lecture profils : district voit les responsables groupe de son district (+ soi-même)
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or app_private.has_role(array['admin']::public.app_role[])
    or (
      app_private.has_role(array['centre']::public.app_role[])
      and role <> 'admin'
    )
    or (
      app_private.has_role(array['chapitre']::public.app_role[])
      and role <> 'admin'
      and chapitre_id is not null
      and chapitre_id = (app_private.current_profile()).chapitre_id
    )
    or (
      app_private.has_role(array['district']::public.app_role[])
      and role = 'groupe'
      and district_id is not null
      and district_id = (app_private.current_profile()).district_id
    )
  );

-- Écriture : district peut gérer les comptes groupe de son district
drop policy if exists profiles_staff_write on public.profiles;
create policy profiles_staff_write on public.profiles
  for all to authenticated
  using (
    app_private.has_role(array['admin']::public.app_role[])
    or (
      app_private.has_role(array['centre']::public.app_role[])
      and role <> 'admin'
    )
    or (
      app_private.has_role(array['chapitre']::public.app_role[])
      and role in ('district', 'groupe')
      and chapitre_id is not null
      and chapitre_id = (app_private.current_profile()).chapitre_id
    )
    or (
      app_private.has_role(array['district']::public.app_role[])
      and role = 'groupe'
      and district_id is not null
      and district_id = (app_private.current_profile()).district_id
    )
  )
  with check (
    app_private.has_role(array['admin']::public.app_role[])
    or (
      app_private.has_role(array['centre']::public.app_role[])
      and role <> 'admin'
    )
    or (
      app_private.has_role(array['chapitre']::public.app_role[])
      and role in ('district', 'groupe')
      and chapitre_id is not null
      and chapitre_id = (app_private.current_profile()).chapitre_id
    )
    or (
      app_private.has_role(array['district']::public.app_role[])
      and role = 'groupe'
      and district_id is not null
      and district_id = (app_private.current_profile()).district_id
    )
  );

-- Invitations : district autorisé
drop policy if exists user_invitations_select on public.user_invitations;
create policy user_invitations_select on public.user_invitations
  for select to authenticated
  using (app_private.has_role(array['admin', 'centre', 'chapitre', 'district']::public.app_role[]));

drop policy if exists user_invitations_write on public.user_invitations;
create policy user_invitations_write on public.user_invitations
  for all to authenticated
  using (app_private.has_role(array['admin', 'centre', 'chapitre', 'district']::public.app_role[]))
  with check (app_private.has_role(array['admin', 'centre', 'chapitre', 'district']::public.app_role[]));

-- Liste utilisateurs pour district (groupes de son district)
drop function if exists public.list_managed_profiles();
create or replace function public.list_managed_profiles()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.app_role,
  status public.profile_status,
  telephone text,
  department text,
  quartier text,
  bio text,
  photo_url text,
  chapitre_id uuid,
  district_id uuid,
  groupe_id uuid,
  chapitre_name text,
  district_name text,
  groupe_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  me public.profiles;
begin
  select * into me from public.profiles where profiles.id = auth.uid();
  if me.id is null or me.status <> 'actif' then
    raise exception 'Profil actif requis';
  end if;

  if me.role not in ('admin', 'centre', 'chapitre', 'district') then
    raise exception 'Accès non autorisé à la liste des utilisateurs';
  end if;

  return query
  select
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.status,
    p.telephone,
    p.department,
    p.quartier,
    p.bio,
    p.photo_url,
    p.chapitre_id,
    p.district_id,
    p.groupe_id,
    c.name as chapitre_name,
    d.name as district_name,
    g.name as groupe_name,
    p.created_at,
    p.updated_at
  from public.profiles p
  left join public.chapitres c on c.id = p.chapitre_id
  left join public.districts d on d.id = p.district_id
  left join public.groupes g on g.id = p.groupe_id
  where
    (me.role = 'admin' or p.role <> 'admin')
    and (
      me.role in ('admin', 'centre')
      or (
        me.role = 'chapitre'
        and p.chapitre_id is not null
        and p.chapitre_id = me.chapitre_id
      )
      or (
        me.role = 'district'
        and (
          p.id = me.id
          or (
            p.role = 'groupe'
            and p.district_id is not null
            and p.district_id = me.district_id
          )
        )
      )
    )
  order by p.created_at desc;
end;
$$;

revoke all on function public.list_managed_profiles() from public, anon;
grant execute on function public.list_managed_profiles() to authenticated, service_role;
