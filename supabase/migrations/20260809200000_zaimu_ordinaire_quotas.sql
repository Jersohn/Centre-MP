-- Zaimu ordinaire : campagne typée + écriture hiérarchique des cotas
-- centre → chapitres → districts → groupes

alter table public.zaimu_campaigns
  add column if not exists kind text not null default 'special'
    check (kind in ('ordinaire', 'special'));

comment on column public.zaimu_campaigns.kind is
  'ordinaire = objectif annuel/période zaimu ordinaire ; special = campagne zaimu spécial';

-- Marquer la campagne seed existante
update public.zaimu_campaigns
set kind = 'special'
where code = 'ZS-CAMP-2026';

-- Campagne zaimu ordinaire active (année courante)
insert into public.zaimu_campaigns (code, label, annee, montant_centre, is_active, kind)
values (
  'ZO-' || to_char(current_date, 'YYYY'),
  'Zaimu ordinaire ' || to_char(current_date, 'YYYY'),
  extract(year from current_date)::int,
  0,
  true,
  'ordinaire'
)
on conflict (code) do update
set
  label = excluded.label,
  kind = 'ordinaire',
  is_active = true,
  updated_at = now();

-- Une seule campagne ordinaire active à la fois
create unique index if not exists zaimu_campaigns_one_active_ordinaire
  on public.zaimu_campaigns (kind)
  where kind = 'ordinaire' and is_active = true;

-- RLS écriture hiérarchique des cotas
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
  );

-- Centre peut aussi lire/écrire le montant objectif campagne ordinaire (déjà couvert)
-- Lecture élargie : un chapitre voit les cotas district de son chapitre même sans groupe_id
drop policy if exists zaimu_quota_select on public.zaimu_quota_assignments;
create policy zaimu_quota_select on public.zaimu_quota_assignments
  for select to authenticated
  using (
    app_private.has_role(array['admin', 'centre']::public.app_role[])
    or (
      level = 'centre'
      and app_private.is_active_staff()
    )
    or (
      chapitre_id is not null
      and app_private.can_access_org(chapitre_id, district_id, groupe_id)
    )
    or (
      app_private.has_role(array['chapitre']::public.app_role[])
      and chapitre_id is not null
      and chapitre_id = (app_private.current_profile()).chapitre_id
    )
    or (
      app_private.has_role(array['district']::public.app_role[])
      and district_id is not null
      and district_id = (app_private.current_profile()).district_id
    )
  );
