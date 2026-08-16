import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listChapitres,
  listDistricts,
  listGroupes,
} from "../services/orgService";
import type { ChapitreRow, DistrictRow, GroupeRow } from "../types/supabase";
import { sortByLabel } from "./sortUtils";

export type OrgSelectionIds = {
  chapitreId: string;
  districtId: string;
  groupeId: string;
};

export function useOrgTree() {
  const [chapitres, setChapitres] = useState<ChapitreRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [groupes, setGroupes] = useState<GroupeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [chapRes, distRes, grpRes] = await Promise.all([
      listChapitres(),
      listDistricts(),
      listGroupes(),
    ]);
    if (chapRes.error || distRes.error || grpRes.error) {
      setError(
        chapRes.error?.message ||
          distRes.error?.message ||
          grpRes.error?.message ||
          "Impossible de charger l’organisation.",
      );
      setChapitres([]);
      setDistricts([]);
      setGroupes([]);
    } else {
      setChapitres(sortByLabel(chapRes.data, (item) => item.name));
      setDistricts(sortByLabel(distRes.data, (item) => item.name));
      setGroupes(sortByLabel(grpRes.data, (item) => item.name));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const districtsForChapitreId = useCallback(
    (chapitreId: string) =>
      sortByLabel(
        districts.filter((item) => item.chapitre_id === chapitreId),
        (item) => item.name,
      ),
    [districts],
  );

  const groupesForDistrictId = useCallback(
    (districtId: string) =>
      sortByLabel(
        groupes.filter((item) => item.district_id === districtId),
        (item) => item.name,
      ),
    [groupes],
  );

  const defaultSelection = useMemo((): OrgSelectionIds => {
    const chapitreId = chapitres[0]?.id || "";
    const districtId = districtsForChapitreId(chapitreId)[0]?.id || "";
    const groupeId = groupesForDistrictId(districtId)[0]?.id || "";
    return { chapitreId, districtId, groupeId };
  }, [chapitres, districtsForChapitreId, groupesForDistrictId]);

  const coerceSelection = useCallback(
    (input: Partial<OrgSelectionIds>): OrgSelectionIds => {
      const chapitreId =
        chapitres.some((item) => item.id === input.chapitreId)
          ? input.chapitreId || ""
          : chapitres[0]?.id || "";
      const districtOptions = districtsForChapitreId(chapitreId);
      const districtId =
        districtOptions.some((item) => item.id === input.districtId)
          ? input.districtId || ""
          : districtOptions[0]?.id || "";
      const groupeOptions = groupesForDistrictId(districtId);
      const groupeId =
        groupeOptions.some((item) => item.id === input.groupeId)
          ? input.groupeId || ""
          : groupeOptions[0]?.id || "";
      return { chapitreId, districtId, groupeId };
    },
    [chapitres, districtsForChapitreId, groupesForDistrictId],
  );

  const findByNames = useCallback(
    (names: { chapitre?: string; district?: string; groupe?: string }): OrgSelectionIds => {
      const chapitreName = (names.chapitre || "").trim().toLowerCase();
      const districtName = (names.district || "").trim().toLowerCase();
      const groupeName = (names.groupe || "").trim().toLowerCase();

      const chapitre = chapitreName
        ? chapitres.find((item) => item.name.toLowerCase() === chapitreName)
        : undefined;
      const districtOptions = chapitre ? districtsForChapitreId(chapitre.id) : districts;
      const district = districtName
        ? districtOptions.find((item) => item.name.toLowerCase() === districtName)
        : undefined;
      const resolvedChapitreId =
        chapitre?.id ||
        (district ? districts.find((d) => d.id === district.id)?.chapitre_id : "") ||
        "";
      const groupeOptions = district
        ? groupesForDistrictId(district.id)
        : resolvedChapitreId
          ? groupes.filter((g) =>
              districtsForChapitreId(resolvedChapitreId).some((d) => d.id === g.district_id),
            )
          : groupes;
      const groupe = groupeName
        ? groupeOptions.find((item) => item.name.toLowerCase() === groupeName)
        : undefined;

      // Si un groupe est trouvé, remonter district / chapitre pour cohérence.
      if (groupe) {
        const parentDistrict = districts.find((d) => d.id === groupe.district_id);
        return {
          chapitreId: parentDistrict?.chapitre_id || resolvedChapitreId || "",
          districtId: parentDistrict?.id || district?.id || "",
          groupeId: groupe.id,
        };
      }

      return {
        chapitreId: resolvedChapitreId || chapitre?.id || "",
        districtId: district?.id || "",
        groupeId: "",
      };
    },
    [chapitres, districts, groupes, districtsForChapitreId, groupesForDistrictId],
  );

  const nameOf = useCallback(
    (ids: Partial<OrgSelectionIds>) => ({
      chapitre: chapitres.find((item) => item.id === ids.chapitreId)?.name || "",
      district: districts.find((item) => item.id === ids.districtId)?.name || "",
      groupe: groupes.find((item) => item.id === ids.groupeId)?.name || "",
    }),
    [chapitres, districts, groupes],
  );

  return {
    loading,
    error,
    chapitres,
    districts,
    groupes,
    reload,
    districtsForChapitreId,
    groupesForDistrictId,
    defaultSelection,
    coerceSelection,
    findByNames,
    nameOf,
  };
}
