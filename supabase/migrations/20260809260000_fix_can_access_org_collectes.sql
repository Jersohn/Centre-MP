-- Assouplit can_access_org pour les profils district / chapitre
-- dont le rattachement org était incomplet (ex. chapitre_id manquant).

create or replace function app_private.can_access_org(
  p_chapitre_id uuid,
  p_district_id uuid,
  p_groupe_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  me public.profiles;
begin
  select * into me from app_private.current_profile();
  if me.id is null or me.status <> 'actif' then
    return false;
  end if;

  if me.role in ('admin', 'centre') then
    return true;
  end if;

  if me.role = 'chapitre' then
    if me.chapitre_id is null then
      return false;
    end if;
    return me.chapitre_id = p_chapitre_id;
  end if;

  if me.role = 'district' then
    if me.district_id is null then
      return false;
    end if;
    -- Le district suffit ; si chapitre_id est renseigné, il doit aussi correspondre.
    return me.district_id = p_district_id
      and (me.chapitre_id is null or me.chapitre_id = p_chapitre_id);
  end if;

  if me.role = 'groupe' then
    if me.groupe_id is null then
      return false;
    end if;
    return me.groupe_id = p_groupe_id
      and (me.district_id is null or me.district_id = p_district_id)
      and (me.chapitre_id is null or me.chapitre_id = p_chapitre_id);
  end if;

  return false;
end;
$$;
