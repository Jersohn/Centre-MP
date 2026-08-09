-- =============================================================================
-- Seed : 3 chapitres · 9 districts · 20 groupes + campagne Zaimu 2026
-- =============================================================================

insert into public.chapitres (slug, name, description, sort_order)
values
  ('rissho-ankoku-ron', 'Rissho Ankoku Ron', 'Chapitre engagé dans l’étude et la pratique pour la paix.', 1),
  ('shin-gyo-gaku', 'Shin Gyo Gaku', 'Chapitre dédié à la foi, à la pratique et à l’étude.', 2),
  ('trois-tresors', 'Trois Trésors', 'Chapitre uni autour du Bouddha, du Dharma et de la Sangha.', 3)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

-- Helper: upsert district
create or replace function app_private.seed_district(
  p_chapitre_slug text,
  p_slug text,
  p_name text,
  p_sort int
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_chapitre_id uuid;
  v_id uuid;
begin
  select id into v_chapitre_id from public.chapitres where slug = p_chapitre_slug;
  insert into public.districts (chapitre_id, slug, name, sort_order)
  values (v_chapitre_id, p_slug, p_name, p_sort)
  on conflict (chapitre_id, slug) do update
    set name = excluded.name, sort_order = excluded.sort_order
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function app_private.seed_groupe(
  p_district_id uuid,
  p_slug text,
  p_name text,
  p_sort int
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.groupes (district_id, slug, name, sort_order)
  values (p_district_id, p_slug, p_name, p_sort)
  on conflict (district_id, slug) do update
    set name = excluded.name, sort_order = excluded.sort_order
  returning id into v_id;
  return v_id;
end;
$$;

do $$
declare
  d uuid;
begin
  -- Rissho
  d := app_private.seed_district('rissho-ankoku-ron', 'bodhisattva', 'District Bodhisattva', 1);
  perform app_private.seed_groupe(d, 'boddhisattva', 'BODDHISATTVA', 1);
  perform app_private.seed_groupe(d, 'bonten', 'BONTEN', 2);
  perform app_private.seed_groupe(d, 'preuve-actuelle-rissho', 'PREUVE ACTUELLE (RISHO ANKOKURON)', 3);

  d := app_private.seed_district('rissho-ankoku-ron', 'victoire', 'District Victoire', 2);
  perform app_private.seed_groupe(d, 'victoire', 'VICTOIRE', 1);
  perform app_private.seed_groupe(d, 'esperance', 'ESPÉRANCE', 2);

  d := app_private.seed_district('rissho-ankoku-ron', 'foi', 'District Foi', 3);
  perform app_private.seed_groupe(d, 'daimoku-foi-lotus', 'DAIMOKU DE LA FOI ET LOTUS', 1);
  perform app_private.seed_groupe(d, 'esprit-gakkai', 'ESPRIT GAKKAI', 2);

  -- Shin Gyo Gaku
  d := app_private.seed_district('shin-gyo-gaku', 'shinjin', 'District Shinjin', 1);
  perform app_private.seed_groupe(d, 'preuve-actuelle-shin', 'PREUVE ACTUELLE (SHIN GYO GAKU)', 1);
  perform app_private.seed_groupe(d, 'shinjin', 'SHINJIN', 2);
  perform app_private.seed_groupe(d, 'ishintai', 'ISHINTAI', 3);

  d := app_private.seed_district('shin-gyo-gaku', 'kanjin', 'District Kanjin', 2);
  perform app_private.seed_groupe(d, 'kanjin', 'KANJIN', 1);
  perform app_private.seed_groupe(d, 'kansai', 'KANSAI', 2);

  d := app_private.seed_district('shin-gyo-gaku', 'kudoku', 'District Kudoku', 3);
  perform app_private.seed_groupe(d, 'kudoku', 'KUDOKU', 1);
  perform app_private.seed_groupe(d, 'revolution-humaine', 'RÉVOLUTION HUMAINE', 2);

  -- Trois Trésors
  d := app_private.seed_district('trois-tresors', 'lumiere', 'District Lumière', 1);
  perform app_private.seed_groupe(d, 'la-lumiere', 'LA LUMIÈRE', 1);
  perform app_private.seed_groupe(d, 'la-sagesse', 'LA SAGESSE', 2);

  d := app_private.seed_district('trois-tresors', 'paix', 'District Paix', 2);
  perform app_private.seed_groupe(d, 'la-paix', 'LA PAIX', 1);
  perform app_private.seed_groupe(d, 'printemps', 'PRINTEMPS', 2);

  d := app_private.seed_district('trois-tresors', 'tresors', 'District Trésors', 3);
  perform app_private.seed_groupe(d, 'roi-lion', 'ROI LION', 1);
  perform app_private.seed_groupe(d, 'tour-aux-tresors', 'TOUR AUX TRÉSORS', 2);
end $$;

-- Campagne Zaimu spécial 2026 + répartition égalitaire chapitres/districts/groupes
insert into public.zaimu_campaigns (code, label, annee, montant_centre, is_active)
values ('ZS-CAMP-2026', 'Campagne Zaimu spécial 2026', 2026, 10000000, true)
on conflict (code) do update
set label = excluded.label,
    annee = excluded.annee,
    montant_centre = excluded.montant_centre,
    is_active = excluded.is_active;

do $$
declare
  v_campaign_id uuid;
  v_centre numeric := 10000000;
  v_chapter_share numeric;
  v_chapter record;
  v_chapter_i int := 0;
  v_chapter_count int;
  v_chapitre_assigne numeric;
  v_district record;
  v_district_i int;
  v_district_count int;
  v_district_share numeric;
  v_district_assigne numeric;
  v_groupe record;
  v_groupe_i int;
  v_groupe_count int;
  v_groupe_share numeric;
  v_groupe_assigne numeric;
begin
  select id into v_campaign_id from public.zaimu_campaigns where code = 'ZS-CAMP-2026';
  delete from public.zaimu_quota_assignments where campaign_id = v_campaign_id;

  insert into public.zaimu_quota_assignments (campaign_id, level, assigne)
  values (v_campaign_id, 'centre', v_centre);

  select count(*) into v_chapter_count from public.chapitres;
  v_chapter_share := floor(v_centre / v_chapter_count);

  for v_chapter in select * from public.chapitres order by sort_order
  loop
    v_chapter_i := v_chapter_i + 1;
    if v_chapter_i = v_chapter_count then
      v_chapitre_assigne := v_centre - v_chapter_share * (v_chapter_count - 1);
    else
      v_chapitre_assigne := v_chapter_share;
    end if;

    insert into public.zaimu_quota_assignments (campaign_id, level, chapitre_id, assigne)
    values (v_campaign_id, 'chapitre', v_chapter.id, v_chapitre_assigne);

    select count(*) into v_district_count from public.districts where chapitre_id = v_chapter.id;
    v_district_share := floor(v_chapitre_assigne / greatest(v_district_count, 1));
    v_district_i := 0;

    for v_district in
      select * from public.districts where chapitre_id = v_chapter.id order by sort_order
    loop
      v_district_i := v_district_i + 1;
      if v_district_i = v_district_count then
        v_district_assigne := v_chapitre_assigne - v_district_share * (v_district_count - 1);
      else
        v_district_assigne := v_district_share;
      end if;

      insert into public.zaimu_quota_assignments (
        campaign_id, level, chapitre_id, district_id, assigne
      ) values (
        v_campaign_id, 'district', v_chapter.id, v_district.id, v_district_assigne
      );

      select count(*) into v_groupe_count from public.groupes where district_id = v_district.id;
      v_groupe_share := floor(v_district_assigne / greatest(v_groupe_count, 1));
      v_groupe_i := 0;

      for v_groupe in
        select * from public.groupes where district_id = v_district.id order by sort_order
      loop
        v_groupe_i := v_groupe_i + 1;
        if v_groupe_i = v_groupe_count then
          v_groupe_assigne := v_district_assigne - v_groupe_share * (v_groupe_count - 1);
        else
          v_groupe_assigne := v_groupe_share;
        end if;

        insert into public.zaimu_quota_assignments (
          campaign_id, level, chapitre_id, district_id, groupe_id, assigne
        ) values (
          v_campaign_id, 'groupe', v_chapter.id, v_district.id, v_groupe.id, v_groupe_assigne
        );
      end loop;
    end loop;
  end loop;
end $$;

-- Landing singleton (si absent)
insert into public.landing_content (id, content)
values (
  'landing-singleton',
  jsonb_build_object(
    'heroTitle', 'Développer une vie de valeur, bâtir une société de paix.',
    'contactEmail', 'contact@centremiroirparfait.org',
    'contactPhone', '+225 00 00 00 00',
    'contactAddress', 'Abidjan, Côte d’Ivoire'
  )
)
on conflict (id) do nothing;
