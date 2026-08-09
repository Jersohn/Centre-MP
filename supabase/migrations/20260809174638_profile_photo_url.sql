-- Photo de profil utilisateur (dashboard)
alter table public.profiles
  add column if not exists photo_url text not null default '';

-- Bucket public pour avatars (chemin: {user_id}/avatar.ext)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2621440,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_avatars_select on storage.objects;
create policy profile_avatars_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profile-avatars');

drop policy if exists profile_avatars_insert on storage.objects;
create policy profile_avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_avatars_update on storage.objects;
create policy profile_avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_avatars_delete on storage.objects;
create policy profile_avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or app_private.has_role(array['admin', 'centre']::public.app_role[])
    )
  );

-- RPC liste utilisateurs : inclut photo_url
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

  if me.role not in ('admin', 'centre', 'chapitre') then
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
    me.role in ('admin', 'centre')
    or (
      me.role = 'chapitre'
      and p.chapitre_id is not null
      and p.chapitre_id = me.chapitre_id
    )
  order by p.created_at desc;
end;
$$;

revoke all on function public.list_managed_profiles() from public, anon;
grant execute on function public.list_managed_profiles() to authenticated, service_role;
