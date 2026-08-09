-- =============================================================================
-- Centre Miroir Parfait — fondation backend sécurisée
-- Principes :
--  - RLS activé sur toutes les tables exposées
--  - Rôles / périmètre lus depuis public.profiles (jamais user_metadata)
--  - Fonctions privilégiées dans le schéma privé `app_private`
-- =============================================================================

create extension if not exists "pgcrypto";

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'centre', 'chapitre', 'district', 'groupe');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.profile_status as enum ('actif', 'en_attente', 'suspendu');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_status as enum ('actif', 'en_attente', 'suspendu');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_category as enum (
    'homme', 'femme', 'jeune_homme', 'jeune_fille', 'avenir'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_responsibility as enum (
    'membre_simple',
    'responsable_groupe',
    'responsable_district',
    'responsable_chapitre',
    'responsable_centre'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.collecte_type as enum (
    'vague_paix', 'zaimu_ordinaire', 'zaimu_special'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.collecte_status as enum ('en_attente', 'valide', 'annule');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.quota_level as enum (
    'centre', 'chapitre', 'district', 'groupe', 'membre'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Organisation
-- ---------------------------------------------------------------------------
create table if not exists public.chapitres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  chapitre_id uuid not null references public.chapitres (id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapitre_id, slug),
  unique (chapitre_id, name)
);

create table if not exists public.groupes (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts (id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, slug),
  unique (district_id, name)
);

create index if not exists districts_chapitre_id_idx on public.districts (chapitre_id);
create index if not exists groupes_district_id_idx on public.groupes (district_id);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 auth.users) — source de vérité des rôles / périmètre
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.app_role not null default 'groupe',
  status public.profile_status not null default 'en_attente',
  telephone text not null default '',
  department text not null default '',
  quartier text not null default '',
  bio text not null default '',
  chapitre_id uuid references public.chapitres (id) on delete set null,
  district_id uuid references public.districts (id) on delete set null,
  groupe_id uuid references public.groupes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_scope_coherence check (
    -- Compte créé, pas encore rattaché (inscription)
    status = 'en_attente'
    or (
      role in ('admin', 'centre')
      and chapitre_id is null
      and district_id is null
      and groupe_id is null
    )
    or (
      role = 'chapitre'
      and chapitre_id is not null
      and district_id is null
      and groupe_id is null
    )
    or (
      role = 'district'
      and chapitre_id is not null
      and district_id is not null
      and groupe_id is null
    )
    or (
      role = 'groupe'
      and chapitre_id is not null
      and district_id is not null
      and groupe_id is not null
    )
  )
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_chapitre_id_idx on public.profiles (chapitre_id);
create index if not exists profiles_district_id_idx on public.profiles (district_id);
create index if not exists profiles_groupe_id_idx on public.profiles (groupe_id);

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  prenom text not null,
  nom text not null,
  email text,
  telephone text not null default '',
  date_naissance date,
  departement text not null default '',
  categorie public.member_category not null default 'homme',
  responsabilite public.member_responsibility not null default 'membre_simple',
  date_debut_pratique date,
  abonnement_vague_paix boolean not null default false,
  sokahan boolean not null default false,
  abonnement boolean not null default false,
  quartier text not null default '',
  chapitre_id uuid not null references public.chapitres (id) on delete restrict,
  district_id uuid not null references public.districts (id) on delete restrict,
  groupe_id uuid not null references public.groupes (id) on delete restrict,
  statut public.member_status not null default 'actif',
  photo_url text not null default '',
  adhesion date not null default current_date,
  total_dons numeric(14, 2) not null default 0 check (total_dons >= 0),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_org_idx on public.members (chapitre_id, district_id, groupe_id);
create index if not exists members_statut_idx on public.members (statut);
create index if not exists members_email_idx on public.members (lower(email));
create index if not exists members_name_idx on public.members (lower(nom), lower(prenom));

-- ---------------------------------------------------------------------------
-- Collectes
-- ---------------------------------------------------------------------------
create table if not exists public.collectes (
  id uuid primary key default gen_random_uuid(),
  type public.collecte_type not null,
  member_id uuid references public.members (id) on delete set null,
  membre_label text not null default '',
  montant numeric(14, 2) not null check (montant > 0),
  date_collecte date not null default current_date,
  statut public.collecte_status not null default 'en_attente',
  chapitre_id uuid not null references public.chapitres (id) on delete restrict,
  district_id uuid not null references public.districts (id) on delete restrict,
  groupe_id uuid not null references public.groupes (id) on delete restrict,
  periode text not null default '',
  motif text not null default '',
  reference_recu text not null default '',
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  validated_by uuid references auth.users (id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collectes_org_idx on public.collectes (chapitre_id, district_id, groupe_id);
create index if not exists collectes_type_statut_idx on public.collectes (type, statut);
create index if not exists collectes_date_idx on public.collectes (date_collecte desc);
create index if not exists collectes_member_id_idx on public.collectes (member_id);

-- ---------------------------------------------------------------------------
-- Zaimu campaigns & quota assignments
-- ---------------------------------------------------------------------------
create table if not exists public.zaimu_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  annee int not null check (annee >= 2000 and annee <= 2100),
  montant_centre numeric(14, 2) not null check (montant_centre >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zaimu_quota_assignments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.zaimu_campaigns (id) on delete cascade,
  level public.quota_level not null,
  chapitre_id uuid references public.chapitres (id) on delete cascade,
  district_id uuid references public.districts (id) on delete cascade,
  groupe_id uuid references public.groupes (id) on delete cascade,
  member_id uuid references public.members (id) on delete cascade,
  assigne numeric(14, 2) not null check (assigne >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zaimu_quota_level_shape check (
    (level = 'centre' and chapitre_id is null and district_id is null and groupe_id is null and member_id is null)
    or (level = 'chapitre' and chapitre_id is not null and district_id is null and groupe_id is null and member_id is null)
    or (level = 'district' and chapitre_id is not null and district_id is not null and groupe_id is null and member_id is null)
    or (level = 'groupe' and chapitre_id is not null and district_id is not null and groupe_id is not null and member_id is null)
    or (level = 'membre' and chapitre_id is not null and district_id is not null and groupe_id is not null and member_id is not null)
  )
);

create unique index if not exists zaimu_quota_unique_centre
  on public.zaimu_quota_assignments (campaign_id)
  where level = 'centre';

create unique index if not exists zaimu_quota_unique_chapitre
  on public.zaimu_quota_assignments (campaign_id, chapitre_id)
  where level = 'chapitre';

create unique index if not exists zaimu_quota_unique_district
  on public.zaimu_quota_assignments (campaign_id, district_id)
  where level = 'district';

create unique index if not exists zaimu_quota_unique_groupe
  on public.zaimu_quota_assignments (campaign_id, groupe_id)
  where level = 'groupe';

create unique index if not exists zaimu_quota_unique_membre
  on public.zaimu_quota_assignments (campaign_id, member_id)
  where level = 'membre';

-- ---------------------------------------------------------------------------
-- Landing content ( harden existing table )
-- ---------------------------------------------------------------------------
create table if not exists public.landing_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'chapitres', 'districts', 'groupes', 'profiles', 'members',
    'collectes', 'zaimu_campaigns', 'zaimu_quota_assignments', 'landing_content'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;
