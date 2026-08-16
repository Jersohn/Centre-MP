import type { ReactNode } from "react";
import { X } from "lucide-react";
import { MemberAvatar } from "../MemberAvatar";
import type { MemberRecord } from "../memberFormUtils";
import { sortMembersByName } from "../sortUtils";

export function OrgDetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/50 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="mt-1.5 break-words text-sm font-semibold text-foreground">{value || "—"}</div>
    </div>
  );
}

export function OrgMemberDetailModal({
  membre,
  onClose,
}: {
  membre: MemberRecord;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sgi-tricolor h-1.5 w-full shrink-0" aria-hidden />
        <div className="relative shrink-0 px-4 pb-3 pt-3 sm:px-6 sm:pb-5 sm:pt-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card/80 text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
          <div className="flex items-start gap-3 pr-11">
            <MemberAvatar photo={membre.photo} prenom={membre.prenom} nom={membre.nom} size="lg" />
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sgi-gold)]">
                Fiche membre
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold text-foreground">
                {membre.prenom} {membre.nom}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {[membre.groupe, membre.district, membre.chapitre].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <OrgDetailField label="Email" value={membre.email} />
            <OrgDetailField label="Téléphone" value={membre.telephone} />
            <OrgDetailField label="Statut" value={membre.statut} />
            <OrgDetailField
              label="Responsabilité"
              value={membre.responsabilite === "Membre" ? "Membre simple" : membre.responsabilite}
            />
            <OrgDetailField label="Catégorie" value={membre.categorie || membre.departement} />
            <OrgDetailField label="Date de naissance" value={membre.dateNaissance} />
            <OrgDetailField label="Début de pratique" value={membre.dateDebutPratique} />
            <OrgDetailField label="Adhésion" value={membre.adhesion} />
            <OrgDetailField label="Quartier" value={membre.quartier} />
            <OrgDetailField label="Chapitre" value={membre.chapitre} />
            <OrgDetailField label="District" value={membre.district} />
            <OrgDetailField label="Groupe" value={membre.groupe} />
            <OrgDetailField
              label="Vague de Paix"
              value={membre.abonnementVaguePaix ? "Abonné" : "Non abonné"}
            />
            <OrgDetailField label="Gohonzon" value={membre.gohonzon ? "Oui" : "Non"} />
            <OrgDetailField label="Sokahan" value={membre.sokahan ? "Oui" : "Non"} />
          </div>
        </div>
        <div className="shrink-0 border-t border-border px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[var(--sgi-blue)] px-4 py-3 text-sm font-semibold text-white sm:float-right sm:w-auto"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export function membersOfGroupe(
  members: MemberRecord[],
  groupe: { id: string; name: string },
  districtName?: string | null,
  chapitreName?: string | null,
) {
  return sortMembersByName(
    members.filter((member) => {
      if (member.groupeId && member.groupeId === groupe.id) return true;
      return (
        member.groupe === groupe.name &&
        (!districtName || member.district === districtName) &&
        (!chapitreName || member.chapitre === chapitreName)
      );
    }),
  );
}
