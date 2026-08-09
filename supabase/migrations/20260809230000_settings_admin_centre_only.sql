-- Paramètres réservés au responsable centre et à l'administrateur.
update public.role_module_access
set allowed = false
where module_key = 'settings'
  and role in ('chapitre', 'district', 'groupe');

insert into public.role_module_access (role, module_key, allowed) values
  ('admin', 'settings', true),
  ('centre', 'settings', true)
on conflict (role, module_key) do update
set allowed = excluded.allowed;
