-- Groupe : peut assigner des cotas niveau « membre » dans son groupe.
-- Cascade : centre → chapitre → district → groupe → membre.

drop policy if exists zaimu_quota_write on public.zaimu_quota_assignments;
create policy zaimu_quota_write on public.zaimu_quota_assignments
  for all to authenticated
  using (
    app_private.has_role(array['admin', 'centre']::public.app_role[])
    or (
      app_private.has_role(array['chapitre']::public.app_role[])
      and level = 'district'
      and chapitre_id is not null
      and chapitre_id = (app_private.current_profile()).chapitre_id
    )
    or (
      app_private.has_role(array['district']::public.app_role[])
      and level = 'groupe'
      and district_id is not null
      and district_id = (app_private.current_profile()).district_id
    )
    or (
      app_private.has_role(array['groupe']::public.app_role[])
      and level = 'membre'
      and groupe_id is not null
      and groupe_id = (app_private.current_profile()).groupe_id
    )
  )
  with check (
    app_private.has_role(array['admin', 'centre']::public.app_role[])
    or (
      app_private.has_role(array['chapitre']::public.app_role[])
      and level = 'district'
      and chapitre_id is not null
      and chapitre_id = (app_private.current_profile()).chapitre_id
      and district_id is not null
      and groupe_id is null
      and member_id is null
    )
    or (
      app_private.has_role(array['district']::public.app_role[])
      and level = 'groupe'
      and chapitre_id is not null
      and district_id is not null
      and district_id = (app_private.current_profile()).district_id
      and groupe_id is not null
      and member_id is null
    )
    or (
      app_private.has_role(array['groupe']::public.app_role[])
      and level = 'membre'
      and chapitre_id is not null
      and district_id is not null
      and groupe_id is not null
      and groupe_id = (app_private.current_profile()).groupe_id
      and member_id is not null
    )
  );
