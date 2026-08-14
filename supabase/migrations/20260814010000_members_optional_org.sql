-- Membres : chapitre / district / groupe optionnels (import d’une liste de noms).

alter table public.members
  alter column chapitre_id drop not null,
  alter column district_id drop not null,
  alter column groupe_id drop not null;
