-- Accès statistiques pour les responsables de groupe (périmètre consolidé)
insert into public.role_module_access (role, module_key, allowed)
values ('groupe', 'statistiques', true)
on conflict (role, module_key) do update
set allowed = excluded.allowed,
    updated_at = now();
