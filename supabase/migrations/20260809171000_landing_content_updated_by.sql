-- La table historique n’avait pas updated_by (create if not exists n’ajoute pas la colonne)
alter table public.landing_content
  add column if not exists updated_by uuid references auth.users (id) on delete set null;

notify pgrst, 'reload schema';
