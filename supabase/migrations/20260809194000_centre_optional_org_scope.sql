-- Le responsable centre peut optionnellement être rattaché à un groupe
-- (appartenance), sans perdre son rôle plateforme.

alter table public.profiles
  drop constraint if exists profiles_scope_coherence;

alter table public.profiles
  add constraint profiles_scope_coherence check (
    status = 'en_attente'
    or (
      role = 'admin'
      and chapitre_id is null
      and district_id is null
      and groupe_id is null
    )
    or (
      role = 'centre'
      and (
        (
          chapitre_id is null
          and district_id is null
          and groupe_id is null
        )
        or (
          chapitre_id is not null
          and district_id is not null
          and groupe_id is not null
        )
      )
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
  );
