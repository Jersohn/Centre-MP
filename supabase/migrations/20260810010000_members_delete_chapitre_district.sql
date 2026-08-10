-- Suppression des membres : admin / centre / chapitre / district (périmètre org).
-- Les responsables groupe ne peuvent pas supprimer (désactivation / modification uniquement).

drop policy if exists members_delete_admin_centre on public.members;
drop policy if exists members_delete_elevated on public.members;

create policy members_delete_elevated on public.members
  for delete to authenticated
  using (
    app_private.has_role(array['admin', 'centre', 'chapitre', 'district']::public.app_role[])
    and app_private.can_access_org(chapitre_id, district_id, groupe_id)
  );
