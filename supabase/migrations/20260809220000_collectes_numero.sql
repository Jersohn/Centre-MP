-- Numéros lisibles pour les collectes (VP/ZO/ZS-AAAA-NNN)

alter table public.collectes
  add column if not exists numero text;

comment on column public.collectes.numero is
  'Référence affichée (ex. ZO-2026-001), distincte de l’UUID technique';

-- Génération du prochain numéro pour un type / année
create or replace function public.next_collecte_numero(p_type public.collecte_type, p_date date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_year int;
  v_seq int;
begin
  v_year := extract(year from coalesce(p_date, current_date))::int;
  v_prefix := case p_type
    when 'vague_paix' then 'VP'
    when 'zaimu_ordinaire' then 'ZO'
    when 'zaimu_special' then 'ZS'
    else 'CL'
  end;

  select coalesce(max(
    nullif(substring(numero from '[0-9]+$'), '')::int
  ), 0) + 1
  into v_seq
  from public.collectes
  where type = p_type
    and numero ~ ('^' || v_prefix || '-' || v_year::text || '-[0-9]+$');

  return v_prefix || '-' || v_year::text || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

revoke all on function public.next_collecte_numero(public.collecte_type, date) from public;
grant execute on function public.next_collecte_numero(public.collecte_type, date) to authenticated;

create or replace function public.collectes_set_numero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero is null or btrim(new.numero) = '' then
    new.numero := public.next_collecte_numero(new.type, new.date_collecte);
  end if;
  return new;
end;
$$;

drop trigger if exists collectes_set_numero_trg on public.collectes;
create trigger collectes_set_numero_trg
  before insert on public.collectes
  for each row
  execute function public.collectes_set_numero();

-- Backfill des lignes existantes (ordre chronologique)
with ordered as (
  select
    id,
    type,
    date_collecte,
    row_number() over (
      partition by type, extract(year from date_collecte)
      order by created_at nulls last, date_collecte, id
    ) as seq
  from public.collectes
  where numero is null or btrim(numero) = ''
)
update public.collectes c
set numero = (
  case o.type
    when 'vague_paix' then 'VP'
    when 'zaimu_ordinaire' then 'ZO'
    when 'zaimu_special' then 'ZS'
    else 'CL'
  end
  || '-' || extract(year from o.date_collecte)::int::text
  || '-' || lpad(o.seq::text, 3, '0')
)
from ordered o
where c.id = o.id;

create unique index if not exists collectes_numero_unique
  on public.collectes (numero)
  where numero is not null;

-- Recréer la vue (CREATE OR REPLACE refuse un décalage de colonnes après ajout de numero)
drop view if exists public.v_collectes_enriched;
create view public.v_collectes_enriched
with (security_invoker = true)
as
select
  col.*,
  c.name as chapitre_name,
  d.name as district_name,
  g.name as groupe_name,
  coalesce(col.membre_label, trim(both from m.prenom || ' ' || m.nom)) as membre_display
from public.collectes col
join public.chapitres c on c.id = col.chapitre_id
join public.districts d on d.id = col.district_id
join public.groupes g on g.id = col.groupe_id
left join public.members m on m.id = col.member_id;

grant select on public.v_collectes_enriched to authenticated;
