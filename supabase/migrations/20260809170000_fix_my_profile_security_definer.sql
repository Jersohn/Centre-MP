-- my_profile doit lire le profil même si RLS / timing JWT est fragile au login
create or replace function public.my_profile()
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

revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;
