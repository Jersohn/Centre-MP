-- ---------------------------------------------------------------------------
-- Admin / centre / chapitre peuvent gérer les responsables
-- Chapitre : lecture + écriture limitée à son chapitre (district / groupe)
-- ---------------------------------------------------------------------------

-- Lecture profils : self + admin/centre + chapitre (même chapitre)
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or app_private.has_role(array['admin', 'centre']::public.app_role[])
    or (
      app_private.has_role(array['chapitre']::public.app_role[])
      and chapitre_id is not null
      and chapitre_id = (select p.chapitre_id from public.profiles p where p.id = auth.uid())
    )
  );

-- Écriture : admin ; centre (sauf admin) ; chapitre (district/groupe, même chapitre)
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
      and chapitre_id = (select p.chapitre_id from public.profiles p where p.id = auth.uid())
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
      and chapitre_id = (select p.chapitre_id from public.profiles p where p.id = auth.uid())
    )
  );

-- Invitations visibles / écrivables aussi par chapitre
drop policy if exists user_invitations_select on public.user_invitations;
create policy user_invitations_select on public.user_invitations
  for select to authenticated
  using (app_private.has_role(array['admin', 'centre', 'chapitre']::public.app_role[]));

drop policy if exists user_invitations_write on public.user_invitations;
create policy user_invitations_write on public.user_invitations
  for all to authenticated
  using (app_private.has_role(array['admin', 'centre', 'chapitre']::public.app_role[]))
  with check (app_private.has_role(array['admin', 'centre', 'chapitre']::public.app_role[]));

-- Paramètres utilisateurs pour responsable chapitre
insert into public.role_module_access (role, module_key, allowed) values
  ('chapitre', 'settings', true)
on conflict (role, module_key) do update set allowed = excluded.allowed;
