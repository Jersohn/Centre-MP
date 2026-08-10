-- =============================================================================
-- Paiements validés : modification / suppression réservées à admin et centre
-- =============================================================================

create or replace function app_private.enforce_collecte_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  elevating_to_valid boolean;
begin
  elevating_to_valid :=
    new.statut = 'valide'
    and (
      tg_op = 'INSERT'
      or old.statut is distinct from 'valide'
    );

  if elevating_to_valid
     and not app_private.has_role(array['admin','centre','chapitre']::public.app_role[])
  then
    raise exception 'Validation de collecte réservée aux rôles admin, centre ou chapitre';
  end if;

  -- Une fois validé : seuls admin / centre peuvent modifier ou dévalider
  if tg_op = 'UPDATE'
     and old.statut = 'valide'
     and not app_private.has_role(array['admin','centre']::public.app_role[])
  then
    raise exception
      'Paiement validé verrouillé : seuls le responsable centre ou l’administrateur peuvent le modifier';
  end if;

  if elevating_to_valid then
    new.validated_by := auth.uid();
    new.validated_at := now();
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function app_private.enforce_collecte_validated_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.statut = 'valide'
     and not app_private.has_role(array['admin','centre']::public.app_role[])
  then
    raise exception
      'Paiement validé verrouillé : seuls le responsable centre ou l’administrateur peuvent le supprimer';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_enforce_collecte_validated_delete on public.collectes;
create trigger trg_enforce_collecte_validated_delete
before delete on public.collectes
for each row execute function app_private.enforce_collecte_validated_delete();
