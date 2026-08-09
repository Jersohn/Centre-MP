-- Champs profil alignés sur la fiche membre (complétion par l'utilisateur).

alter table public.profiles
  add column if not exists prenom text not null default '',
  add column if not exists nom text not null default '',
  add column if not exists date_naissance date,
  add column if not exists date_debut_pratique date,
  add column if not exists sokahan boolean not null default false,
  add column if not exists abonnement_vague_paix boolean not null default false,
  add column if not exists abonnement boolean not null default false;

-- Remplir prénom / nom depuis full_name quand absents
update public.profiles
set
  prenom = coalesce(nullif(trim(prenom), ''), split_part(trim(full_name), ' ', 1), ''),
  nom = coalesce(
    nullif(trim(nom), ''),
    nullif(trim(substr(trim(full_name), length(split_part(trim(full_name), ' ', 1)) + 1)), ''),
    ''
  )
where coalesce(trim(full_name), '') <> ''
  and (coalesce(trim(prenom), '') = '' or coalesce(trim(nom), '') = '');
