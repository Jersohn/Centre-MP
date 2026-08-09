-- Rétablit Paramètres pour le responsable chapitre (gestion des responsables de son périmètre).
-- District / groupe restent sans accès Paramètres.
insert into public.role_module_access (role, module_key, allowed) values
  ('chapitre', 'settings', true),
  ('admin', 'settings', true),
  ('centre', 'settings', true)
on conflict (role, module_key) do update
set allowed = excluded.allowed;

update public.role_module_access
set allowed = false
where module_key = 'settings'
  and role in ('district', 'groupe');
