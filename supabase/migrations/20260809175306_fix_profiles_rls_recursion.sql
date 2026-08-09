-- Corrige la récursion infinie RLS sur public.profiles (erreur 42P17).
-- Cause : sous-requêtes SELECT sur profiles dans les policies profiles elles-mêmes.
-- Remède : utiliser uniquement app_private.current_profile() (SECURITY DEFINER).

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or app_private.has_role(array['admin', 'centre']::public.app_role[])
    or (
      app_private.has_role(array['chapitre']::public.app_role[])
      and chapitre_id is not null
      and chapitre_id = (app_private.current_profile()).chapitre_id
    )
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (app_private.current_profile()).role
    and status = (app_private.current_profile()).status
    and chapitre_id is not distinct from (app_private.current_profile()).chapitre_id
    and district_id is not distinct from (app_private.current_profile()).district_id
    and groupe_id is not distinct from (app_private.current_profile()).groupe_id
  );

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
  );
