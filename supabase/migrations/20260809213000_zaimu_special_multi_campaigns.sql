-- Zaimu spécial : multi-campagnes, échéances, publication vers les responsables

alter table public.zaimu_campaigns
  add column if not exists date_echeance date,
  add column if not exists published_at timestamptz,
  add column if not exists description text not null default '';

comment on column public.zaimu_campaigns.date_echeance is
  'Date limite globale de la campagne zaimu spécial';
comment on column public.zaimu_campaigns.published_at is
  'Renseigné quand le centre a soumis la répartition par chapitre (visibilité responsables)';

alter table public.zaimu_quota_assignments
  add column if not exists date_echeance date;

comment on column public.zaimu_quota_assignments.date_echeance is
  'Échéance spécifique du niveau (sinon héritage campagne)';

-- Campagnes seed spéciales déjà existantes : les marquer publiées si des cotas chapitre existent
update public.zaimu_campaigns c
set published_at = coalesce(c.published_at, c.created_at)
where c.kind = 'special'
  and c.published_at is null
  and exists (
    select 1
    from public.zaimu_quota_assignments a
    where a.campaign_id = c.id
      and a.level = 'chapitre'
      and a.assigne > 0
  );

-- Si date_echeance absente sur le seed, fin d'année campagne
update public.zaimu_campaigns
set date_echeance = make_date(annee, 12, 31)
where kind = 'special'
  and date_echeance is null;
