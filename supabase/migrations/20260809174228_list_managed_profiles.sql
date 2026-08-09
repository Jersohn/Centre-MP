-- Liste des profils gérables (admin/centre : tous ; chapitre : même chapitre)
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
