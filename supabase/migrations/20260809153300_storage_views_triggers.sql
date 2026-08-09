-- =============================================================================
-- Storage photos, vues sécurisées, garde-fous métier
-- =============================================================================

-- Seuls admin / centre / chapitre peuvent valider une collecte
create or replace function app_private.enforce_collecte_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  elevating_to_valid boolean;
begin
  elevating_to_valid :=
    new.statut = 'valide'
    and (
      tg_op = 'INSERT'
      or old.statut is distinct from 'valide'
    );

  if elevating_to_valid
     and not app_private.has_role(array['admin','centre','chapitre']::public.app_role[])
  then
    raise exception 'Validation de collecte réservée aux rôles admin, centre ou chapitre';
  end if;

  if elevating_to_valid then
    new.validated_by := auth.uid();
    new.validated_at := now();
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_enforce_collecte_status on public.collectes;
create trigger trg_enforce_collecte_status
before insert or update on public.collectes
for each row execute function app_private.enforce_collecte_status_change();

create or replace function app_private.set_row_actor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_members_actor on public.members;
create trigger trg_members_actor
before insert or update on public.members
for each row execute function app_private.set_row_actor();

-- Vue org aplatie (security_invoker = respecte RLS des tables sous-jacentes)
create or replace view public.v_org_tree
with (security_invoker = true)
as
select
  c.id as chapitre_id,
  c.slug as chapitre_slug,
  c.name as chapitre_name,
  d.id as district_id,
  d.slug as district_slug,
  d.name as district_name,
  g.id as groupe_id,
  g.slug as groupe_slug,
  g.name as groupe_name
from public.chapitres c
join public.districts d on d.chapitre_id = c.id
join public.groupes g on g.district_id = d.id
order by c.sort_order, d.sort_order, g.sort_order;

grant select on public.v_org_tree to anon, authenticated;

-- Vue collectes enrichie
create or replace view public.v_collectes_enriched
with (security_invoker = true)
as
select
  col.*,
  c.name as chapitre_name,
  d.name as district_name,
  g.name as groupe_name,
  coalesce(col.membre_label, trim(both from m.prenom || ' ' || m.nom)) as membre_display
from public.collectes col
join public.chapitres c on c.id = col.chapitre_id
join public.districts d on d.id = col.district_id
join public.groupes g on g.id = col.groupe_id
left join public.members m on m.id = col.member_id;

grant select on public.v_collectes_enriched to authenticated;

-- Storage buckets (photos membres / landing)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'member-photos',
    'member-photos',
    false,
    2621440,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'landing-media',
    'landing-media',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- member-photos : staff authentifié dans son périmètre (chemin: {groupe_id}/{member_id}.ext)
drop policy if exists member_photos_select on storage.objects;
create policy member_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'member-photos'
    and app_private.is_active_staff()
  );

drop policy if exists member_photos_insert on storage.objects;
create policy member_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and app_private.is_active_staff()
  );

drop policy if exists member_photos_update on storage.objects;
create policy member_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'member-photos' and app_private.is_active_staff())
  with check (bucket_id = 'member-photos' and app_private.is_active_staff());

drop policy if exists member_photos_delete on storage.objects;
create policy member_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'member-photos'
    and app_private.has_role(array['admin','centre']::public.app_role[])
  );

-- landing-media : lecture publique, écriture admin/centre
drop policy if exists landing_media_select on storage.objects;
create policy landing_media_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'landing-media');

drop policy if exists landing_media_write on storage.objects;
create policy landing_media_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'landing-media'
    and app_private.has_role(array['admin','centre']::public.app_role[])
  )
  with check (
    bucket_id = 'landing-media'
    and app_private.has_role(array['admin','centre']::public.app_role[])
  );
