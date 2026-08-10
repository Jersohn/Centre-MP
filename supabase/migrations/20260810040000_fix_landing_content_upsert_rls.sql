-- Corrige l'échec RLS sur upsert landing_content (admin/centre en prod).
-- Cause fréquente : INSERT via upsert PostgREST refusé si has_role ne passe
-- pas, ou singleton absent. On expose une RPC security definer contrôlée.

grant select on table public.landing_content to anon, authenticated;
grant insert, update on table public.landing_content to authenticated;

-- Garantit la ligne singleton (lecture publique du site)
insert into public.landing_content (id, content)
values ('landing-singleton', '{}'::jsonb)
on conflict (id) do nothing;

-- Politiques explicites (idempotentes)
drop policy if exists landing_content_select_public on public.landing_content;
create policy landing_content_select_public on public.landing_content
  for select to anon, authenticated
  using (true);

drop policy if exists landing_content_write_staff on public.landing_content;
create policy landing_content_write_staff on public.landing_content
  for insert to authenticated
  with check (app_private.has_role(array['admin', 'centre']::public.app_role[]));

drop policy if exists landing_content_update_staff on public.landing_content;
create policy landing_content_update_staff on public.landing_content
  for update to authenticated
  using (app_private.has_role(array['admin', 'centre']::public.app_role[]))
  with check (app_private.has_role(array['admin', 'centre']::public.app_role[]));

create or replace function public.upsert_landing_content(p_content jsonb)
returns public.landing_content
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.landing_content;
begin
  if auth.uid() is null then
    raise exception 'Session requise pour publier le contenu du site.'
      using errcode = '42501';
  end if;

  if not app_private.has_role(array['admin', 'centre']::public.app_role[]) then
    raise exception
      'Accès refusé : seuls un administrateur ou un responsable centre actifs peuvent modifier le site. Vérifiez le rôle et le statut du profil (actif).'
      using errcode = '42501';
  end if;

  insert into public.landing_content as lc (id, content, updated_at, updated_by)
  values (
    'landing-singleton',
    coalesce(p_content, '{}'::jsonb),
    now(),
    auth.uid()
  )
  on conflict (id) do update
    set
      content = excluded.content,
      updated_at = now(),
      updated_by = auth.uid()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.upsert_landing_content(jsonb) from public, anon;
grant execute on function public.upsert_landing_content(jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
