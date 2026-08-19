import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, ChevronRight, Trash2, X } from "lucide-react";
import type { MemberRecord } from "./memberFormUtils";
import { useConfirm } from "./ConfirmDialog";
import { canDeleteMember, canReassignMember } from "./orgAccess";
import type { PlatformRole } from "./roles";
import { useOrgTree } from "./useOrgTree";
import { deleteMemberRemote, hasRemoteMembers, reassignMemberOrgRemote } from "../services/memberService";
import { deleteUserRemote, hasRemoteProfiles, updateProfileRemote } from "../services/profileService";
import { MemberAvatar } from "./MemberAvatar";
import { useOpsData } from "./opsDataStore";
import { displayResponsabilite } from "./responsabilites";

export function ListCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label
      className="inline-flex shrink-0 cursor-pointer items-center justify-center p-0.5"
      title={label}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <span className="sr-only">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-border text-[var(--sgi-blue)] accent-[var(--sgi-blue)]"
        checked={checked}
        ref={(node) => {
          if (node) node.indeterminate = indeterminate && !checked;
        }}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function memberSelectionKey(member: Pick<MemberRecord, "id" | "remoteId">): string {
  return member.remoteId ? `remote:${member.remoteId}` : `local:${member.id}`;
}

export function useIdSelection(catalogIds?: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const catalogKey = catalogIds && catalogIds.length > 0 ? catalogIds.join("\0") : "";

  useEffect(() => {
    // Catalogue vide = chargement / erreur de reload : ne pas vider la sélection.
    if (!catalogKey) return;
    const valid = new Set(catalogKey.split("\0"));
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [catalogKey]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setMany = (ids: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const clear = () => setSelectedIds(new Set());

  return { selectedIds, toggle, setMany, clear, count: selectedIds.size };
}

type OrgTarget = {
  chapitre_id: string;
  district_id: string;
  groupe_id: string;
  chapitre: string;
  district: string;
  groupe: string;
};

type ScopeLock = {
  chapitre?: string;
  district?: string;
};

export function MemberBulkBar({
  selectedCount,
  hiddenCount,
  hiddenMembers = [],
  pageIds,
  filteredIds,
  selectedIds,
  onTogglePage,
  onSelectFiltered,
  onRemove,
  onClear,
  onDelete,
  onReassign,
  canDelete,
  canReassign,
  busy,
}: {
  selectedCount: number;
  hiddenCount: number;
  hiddenMembers?: { key: string; name: string }[];
  pageIds: string[];
  filteredIds: string[];
  selectedIds: Set<string>;
  onTogglePage: (selected: boolean) => void;
  onSelectFiltered: () => void;
  onRemove?: (key: string) => void;
  onClear: () => void;
  onDelete: () => void;
  onReassign: () => void;
  canDelete: boolean;
  canReassign: boolean;
  busy?: boolean;
}) {
  const pageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const pagePartial = pageIds.some((id) => selectedIds.has(id)) && !pageSelected;
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  if (pageIds.length === 0 && selectedCount === 0) return null;

  if (selectedCount === 0) {
    return (
      <div className="flex items-center gap-2">
        <ListCheckbox
          checked={pageSelected}
          indeterminate={pagePartial}
          onChange={onTogglePage}
          label="Sélectionner la page"
        />
        <span className="text-[11px] text-muted-foreground">Sélection</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <ListCheckbox
        checked={pageSelected}
        indeterminate={pagePartial}
        onChange={onTogglePage}
        label="Sélectionner la page"
      />
      <span className="text-xs font-semibold text-foreground">
        {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
        {hiddenCount > 0 ? (
          <span className="ml-1 font-normal text-muted-foreground">
            · {hiddenCount} hors recherche
          </span>
        ) : null}
      </span>
      {hiddenMembers.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {hiddenMembers.slice(0, 6).map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={busy}
              onClick={() => onRemove?.(item.key)}
              className="inline-flex max-w-[9rem] items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-foreground hover:bg-muted disabled:opacity-50"
              title={`Retirer ${item.name}`}
            >
              <span className="truncate">{item.name}</span>
              <X size={10} />
            </button>
          ))}
          {hiddenMembers.length > 6 ? (
            <span className="text-[10px] text-muted-foreground">+{hiddenMembers.length - 6}</span>
          ) : null}
        </div>
      ) : null}
      {!allFilteredSelected && filteredIds.length > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={onSelectFiltered}
          className="text-[11px] font-medium text-[var(--sgi-blue)] hover:underline disabled:opacity-50"
        >
          Ajouter ces résultats ({filteredIds.length})
        </button>
      )}
      {canReassign && (
        <button
          type="button"
          disabled={busy}
          onClick={onReassign}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          <ArrowRightLeft size={12} /> Réaffecter
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <Trash2 size={12} /> Supprimer
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onClear}
        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <X size={12} /> Annuler
      </button>
    </div>
  );
}

export function MemberReassignDialog({
  open,
  count,
  scopeLock,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  count: number;
  scopeLock?: ScopeLock;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (org: OrgTarget) => void;
}) {
  const orgTree = useOrgTree();
  const lockedChapitre = (scopeLock?.chapitre || "").trim();
  const lockedDistrict = (scopeLock?.district || "").trim();
  const [chapitreId, setChapitreId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [groupeId, setGroupeId] = useState("");

  const chapitres = useMemo(() => {
    if (!lockedChapitre) return orgTree.chapitres;
    return orgTree.chapitres.filter((item) => item.name === lockedChapitre);
  }, [lockedChapitre, orgTree.chapitres]);

  const districts = useMemo(() => {
    const list = chapitreId ? orgTree.districtsForChapitreId(chapitreId) : [];
    if (!lockedDistrict) return list;
    return list.filter((item) => item.name === lockedDistrict);
  }, [chapitreId, lockedDistrict, orgTree.districtsForChapitreId]);

  const groupes = useMemo(
    () => (districtId ? orgTree.groupesForDistrictId(districtId) : []),
    [districtId, orgTree.groupesForDistrictId],
  );

  useEffect(() => {
    if (!open) {
      setChapitreId("");
      setDistrictId("");
      setGroupeId("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || orgTree.loading) return;
    setChapitreId((current) =>
      chapitres.some((item) => item.id === current) ? current : chapitres[0]?.id || "",
    );
  }, [open, orgTree.loading, chapitres]);

  useEffect(() => {
    if (!open) return;
    setDistrictId((current) =>
      districts.some((item) => item.id === current) ? current : districts[0]?.id || "",
    );
  }, [open, districts]);

  useEffect(() => {
    if (!open) return;
    setGroupeId((current) =>
      groupes.some((item) => item.id === current) ? current : groupes[0]?.id || "",
    );
  }, [open, groupes]);

  if (!open) return null;

  const chapitre = chapitres.find((item) => item.id === chapitreId);
  const district = districts.find((item) => item.id === districtId);
  const groupe = groupes.find((item) => item.id === groupeId);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-foreground">Réaffecter à un groupe</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {count} membre{count > 1 ? "s" : ""} sera{count > 1 ? "ont" : ""} rattaché
            {count > 1 ? "s" : ""} au groupe choisi.
          </p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Chapitre</span>
            <select
              value={chapitreId}
              disabled={Boolean(lockedChapitre) || busy || orgTree.loading}
              onChange={(event) => setChapitreId(event.target.value)}
              className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none focus:border-[var(--sgi-blue)] disabled:opacity-60"
            >
              {orgTree.loading && <option value="">Chargement…</option>}
              {!orgTree.loading && chapitres.length === 0 && (
                <option value="">Aucun chapitre</option>
              )}
              {chapitres.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">District</span>
            <select
              value={districtId}
              disabled={Boolean(lockedDistrict) || busy || !chapitreId}
              onChange={(event) => setDistrictId(event.target.value)}
              className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none focus:border-[var(--sgi-blue)] disabled:opacity-60"
            >
              {districts.length === 0 && <option value="">Aucun district</option>}
              {districts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Groupe</span>
            <select
              value={groupeId}
              disabled={busy || !districtId || groupes.length === 0}
              onChange={(event) => setGroupeId(event.target.value)}
              className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none focus:border-[var(--sgi-blue)] disabled:opacity-60"
            >
              {groupes.length === 0 && <option value="">Aucun groupe dans ce district</option>}
              {groupes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || !chapitre || !district || !groupe}
            onClick={() => {
              if (!chapitre || !district || !groupe) return;
              onConfirm({
                chapitre_id: chapitre.id,
                district_id: district.id,
                groupe_id: groupe.id,
                chapitre: chapitre.name,
                district: district.name,
                groupe: groupe.name,
              });
            }}
            className="rounded-xl bg-[var(--sgi-blue)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy ? "Réaffectation…" : "Réaffecter"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

async function deleteOneMember(member: MemberRecord): Promise<string | null> {
  if (member.source === "profile") {
    if (hasRemoteProfiles() && member.remoteId) {
      const { error } = await deleteUserRemote(member.remoteId);
      return error?.message || null;
    }
    return null;
  }
  if (hasRemoteMembers() && member.remoteId) {
    const { error } = await deleteMemberRemote(member.remoteId);
    return error?.message || null;
  }
  return null;
}

async function reassignOneMember(member: MemberRecord, org: OrgTarget): Promise<string | null> {
  if (member.source === "profile") {
    if (hasRemoteProfiles() && member.remoteId) {
      const { error } = await updateProfileRemote({
        user_id: member.remoteId,
        chapitre_id: org.chapitre_id,
        district_id: org.district_id,
        groupe_id: org.groupe_id,
      });
      return error?.message || null;
    }
    return null;
  }
  if (hasRemoteMembers() && member.remoteId) {
    const { error } = await reassignMemberOrgRemote(member.remoteId, {
      chapitre_id: org.chapitre_id,
      district_id: org.district_id,
      groupe_id: org.groupe_id,
    });
    return error?.message || null;
  }
  return null;
}

export function useMemberBulkActions(
  role: PlatformRole,
  members: MemberRecord[],
  options?: { pageMembers?: MemberRecord[]; scopeLock?: ScopeLock; onToast?: (message: string) => void },
) {
  const { confirm } = useConfirm();
  const { members: catalog, setMembers, reloadMembers } = useOpsData();
  const pageMembers = options?.pageMembers || members;
  const catalogIds = useMemo(() => catalog.map(memberSelectionKey), [catalog]);
  const visibleIds = useMemo(() => members.map(memberSelectionKey), [members]);
  const pageIds = useMemo(() => pageMembers.map(memberSelectionKey), [pageMembers]);
  const selection = useIdSelection(catalogIds);
  const namesByKeyRef = useRef<Map<string, string>>(new Map());
  const [busy, setBusy] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  useEffect(() => {
    for (const item of catalog) {
      namesByKeyRef.current.set(memberSelectionKey(item), `${item.prenom} ${item.nom}`.trim());
    }
  }, [catalog]);

  const selectedMembers = useMemo(
    () => catalog.filter((item) => selection.selectedIds.has(memberSelectionKey(item))),
    [catalog, selection.selectedIds],
  );
  const hiddenMembers = useMemo(() => {
    const visible = new Set(visibleIds);
    const chips: { key: string; name: string }[] = [];
    for (const key of selection.selectedIds) {
      if (visible.has(key)) continue;
      chips.push({ key, name: namesByKeyRef.current.get(key) || "Membre" });
    }
    return chips;
  }, [selection.selectedIds, visibleIds, catalog]);
  const hiddenCount = hiddenMembers.length;
  const deletable = selectedMembers.filter((item) => canDeleteMember(role, item));
  const reassignable = selectedMembers.filter((item) => canReassignMember(role, item));

  const handleDelete = async () => {
    if (deletable.length === 0) return;
    const skipped = selectedMembers.length - deletable.length;
    const ok = await confirm({
      title: `Supprimer ${deletable.length} membre${deletable.length > 1 ? "s" : ""} ?`,
      description: skipped
        ? `${deletable.length} fiche${deletable.length > 1 ? "s" : ""} sera${deletable.length > 1 ? "ont" : ""} supprimée${deletable.length > 1 ? "s" : ""}. ${skipped} sélection non supprimable ignorée.`
        : "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    const deletedIds: string[] = [];
    let firstError: string | null = null;
    for (const member of deletable) {
      const error = await deleteOneMember(member);
      if (error) {
        firstError = error;
        break;
      }
      deletedIds.push(memberSelectionKey(member));
    }
    if (deletedIds.length > 0) {
      setMembers((prev) => prev.filter((item) => !deletedIds.includes(memberSelectionKey(item))));
      selection.clear();
    }
    setBusy(false);
    void reloadMembers();
    const message = firstError
      ? `${deletedIds.length} suppression(s) puis erreur : ${firstError}`
      : `${deletedIds.length} membre${deletedIds.length > 1 ? "s" : ""} supprimé${deletedIds.length > 1 ? "s" : ""}.`;
    options?.onToast?.(message);
    return message;
  };

  const handleReassign = async (org: OrgTarget) => {
    const targets = selectedMembers.filter((item) => canReassignMember(role, item));
    if (targets.length === 0) {
      options?.onToast?.("Aucun membre sélectionné n’est réaffectable.");
      return;
    }
    setBusy(true);
    const updatedIds: string[] = [];
    let firstError: string | null = null;
    for (const member of targets) {
      const error = await reassignOneMember(member, org);
      if (error) {
        firstError = error;
        break;
      }
      updatedIds.push(memberSelectionKey(member));
    }
    if (updatedIds.length > 0) {
      setMembers((prev) =>
        prev.map((item) =>
          updatedIds.includes(memberSelectionKey(item))
            ? {
                ...item,
                chapitre: org.chapitre,
                district: org.district,
                groupe: org.groupe,
                chapitreId: org.chapitre_id,
                districtId: org.district_id,
                groupeId: org.groupe_id,
              }
            : item,
        ),
      );
      selection.clear();
    }
    setBusy(false);
    setReassignOpen(false);
    void reloadMembers();
    const message = firstError
      ? `${updatedIds.length} réaffectation(s) puis erreur : ${firstError}`
      : `${updatedIds.length} membre${updatedIds.length > 1 ? "s" : ""} réaffecté${updatedIds.length > 1 ? "s" : ""} vers ${org.groupe}.`;
    options?.onToast?.(message);
    return message;
  };

  const bar = (
    <MemberBulkBar
      selectedCount={selection.count}
      hiddenCount={hiddenCount}
      hiddenMembers={hiddenMembers}
      pageIds={pageIds}
      filteredIds={visibleIds}
      selectedIds={selection.selectedIds}
      onTogglePage={(selected) => selection.setMany(pageIds, selected)}
      onSelectFiltered={() => selection.setMany(visibleIds, true)}
      onRemove={(key) => selection.setMany([key], false)}
      onClear={selection.clear}
      onDelete={() => {
        void handleDelete();
      }}
      onReassign={() => setReassignOpen(true)}
      canDelete={deletable.length > 0}
      canReassign={reassignable.length > 0}
      busy={busy}
    />
  );

  const dialog = (
    <MemberReassignDialog
      open={reassignOpen}
      count={reassignable.length || selectedMembers.length}
      scopeLock={options?.scopeLock}
      busy={busy}
      onClose={() => setReassignOpen(false)}
      onConfirm={(org) => {
        void handleReassign(org);
      }}
    />
  );

  return {
    ...selection,
    isSelected: (member: MemberRecord) => selection.selectedIds.has(memberSelectionKey(member)),
    toggleMember: (member: MemberRecord) => selection.toggle(memberSelectionKey(member)),
    bar,
    dialog,
    busy,
    handleDelete: async () => {
      const message = await handleDelete();
      return message;
    },
    handleReassign,
  };
}

export function OrgMemberRows({
  members,
  role,
  onOpen,
  onToast,
}: {
  members: MemberRecord[];
  role: PlatformRole;
  onOpen: (member: MemberRecord) => void;
  onToast: (message: string) => void;
}) {
  const bulk = useMemberBulkActions(role, members, { onToast });

  return (
    <>
      <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">{bulk.bar}</div>
      {bulk.dialog}
      {members.map((member) => {
        const checked = bulk.isSelected(member);
        return (
          <div
            key={memberSelectionKey(member)}
            className={`flex items-center gap-2 rounded-2xl border px-3 py-3 transition ${
              checked
                ? "border-[var(--sgi-blue)]/35 bg-[var(--sgi-blue)]/8"
                : "border-transparent bg-muted/25 hover:border-border hover:bg-muted/50"
            }`}
          >
            <ListCheckbox
              checked={checked}
              onChange={() => bulk.toggleMember(member)}
              label={`Sélectionner ${member.prenom} ${member.nom}`}
            />
            <button
              type="button"
              onClick={() => onOpen(member)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <MemberAvatar photo={member.photo} prenom={member.prenom} nom={member.nom} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-foreground">
                  {member.prenom} {member.nom}
                </div>
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {displayResponsabilite(member.responsabilite)}
                  {" · "}
                  {member.statut}
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </>
  );
}

export type { OrgTarget, ScopeLock };
