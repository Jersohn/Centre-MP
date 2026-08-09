-- ---------------------------------------------------------------------------
-- Centre peut gérer les profils (sauf auto-promotion admin)
-- Matrice RBAC persistée + préférences applicatives
-- ---------------------------------------------------------------------------

-- Profiles : admin + centre en écriture (centre ne peut pas créer/modifier un admin)
drop policy if exists profiles_admin_write on public.profiles;
drop policy if exists profiles_staff_write on public.profiles;

create policy profiles_staff_write on public.profiles
  for all to authenticated
  using (
    app_private.has_role(array['admin']::public.app_role[])
    or (
      app_private.has_role(array['centre']::public.app_role[])
      and role <> 'admin'
    )
  )
  with check (
    app_private.has_role(array['admin']::public.app_role[])
    or (
      app_private.has_role(array['centre']::public.app_role[])
      and role <> 'admin'
    )
  );

-- Matrice d'accès modules par rôle (pilotée depuis Paramètres > RBAC)
create table if not exists public.role_module_access (
  role public.app_role not null,
  module_key text not null,
  allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (role, module_key),
  constraint role_module_access_module_check check (
    module_key in (
      'dashboard', 'membres', 'finances', 'collectes', 'directives',
      'statistiques', 'settings', 'contenu', 'profil'
    )
  )
);

alter table public.role_module_access enable row level security;

drop policy if exists role_module_access_select on public.role_module_access;
create policy role_module_access_select on public.role_module_access
  for select to authenticated
  using (app_private.is_active_staff());

drop policy if exists role_module_access_write on public.role_module_access;
create policy role_module_access_write on public.role_module_access
  for all to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]))
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));

-- Seed défaut aligné sur le frontend
insert into public.role_module_access (role, module_key, allowed) values
  ('admin', 'dashboard', true),
  ('admin', 'membres', true),
  ('admin', 'finances', true),
  ('admin', 'collectes', true),
  ('admin', 'statistiques', true),
  ('admin', 'profil', true),
  ('admin', 'settings', true),
  ('admin', 'contenu', true),
  ('centre', 'dashboard', true),
  ('centre', 'membres', true),
  ('centre', 'finances', true),
  ('centre', 'collectes', true),
  ('centre', 'statistiques', true),
  ('centre', 'profil', true),
  ('centre', 'settings', true),
  ('centre', 'contenu', true),
  ('chapitre', 'dashboard', true),
  ('chapitre', 'membres', true),
  ('chapitre', 'collectes', true),
  ('chapitre', 'statistiques', true),
  ('chapitre', 'profil', true),
  ('district', 'dashboard', true),
  ('district', 'membres', true),
  ('district', 'collectes', true),
  ('district', 'statistiques', true),
  ('district', 'profil', true),
  ('groupe', 'dashboard', true),
  ('groupe', 'membres', true),
  ('groupe', 'collectes', true),
  ('groupe', 'statistiques', true),
  ('groupe', 'profil', true)
on conflict (role, module_key) do nothing;

-- Préférences applicatives globales (admin/centre)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to authenticated
  using (app_private.is_active_staff());

drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for all to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]))
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));

insert into public.app_settings (key, value)
values ('general', '{"emailAlerts": true, "autoUpdates": false}'::jsonb)
on conflict (key) do nothing;

-- Activation self-service après invitation (définition du mot de passe)
create or replace function public.activate_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  update public.profiles
  set status = 'actif', updated_at = now()
  where id = auth.uid()
    and status = 'en_attente'
  returning * into row;

  if row.id is null then
    select * into row from public.profiles where id = auth.uid();
  end if;

  return row;
end;
$$;

revoke all on function public.activate_my_profile() from public, anon;
grant execute on function public.activate_my_profile() to authenticated;

-- Journal léger des invitations (audit)
create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  role public.app_role not null,
  invited_by uuid references auth.users (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.user_invitations enable row level security;

drop policy if exists user_invitations_select on public.user_invitations;
create policy user_invitations_select on public.user_invitations
  for select to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]));

drop policy if exists user_invitations_write on public.user_invitations;
create policy user_invitations_write on public.user_invitations
  for all to authenticated
  using (app_private.has_role(array['admin','centre']::public.app_role[]))
  with check (app_private.has_role(array['admin','centre']::public.app_role[]));
