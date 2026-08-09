import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listChapitres,
  listDistricts,
  listGroupes,
} from "../services/orgService";
import type { ChapitreRow, DistrictRow, GroupeRow } from "../types/supabase";

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
      setChapitres(chapRes.data);
      setDistricts(distRes.data);
      setGroupes(grpRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const districtsForChapitreId = useCallback(
    (chapitreId: string) => districts.filter((item) => item.chapitre_id === chapitreId),
    [districts],
  );

  const groupesForDistrictId = useCallback(
    (districtId: string) => groupes.filter((item) => item.district_id === districtId),
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
      const chapitre =
        chapitres.find(
          (item) => item.name.toLowerCase() === (names.chapitre || "").trim().toLowerCase(),
        ) || chapitres[0];
      const districtOptions = chapitre ? districtsForChapitreId(chapitre.id) : [];
      const district =
        districtOptions.find(
          (item) => item.name.toLowerCase() === (names.district || "").trim().toLowerCase(),
        ) || districtOptions[0];
      const groupeOptions = district ? groupesForDistrictId(district.id) : [];
      const groupe =
        groupeOptions.find(
          (item) => item.name.toLowerCase() === (names.groupe || "").trim().toLowerCase(),
        ) || groupeOptions[0];
      return {
        chapitreId: chapitre?.id || "",
        districtId: district?.id || "",
        groupeId: groupe?.id || "",
      };
    },
    [chapitres, districtsForChapitreId, groupesForDistrictId],
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
