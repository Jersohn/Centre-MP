import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { Camera, Plus, UserPlus, X } from "lucide-react";
import { MemberAvatar } from "./MemberAvatar";
import {
  createMemberFromForm,
  emptyMemberFormValues,
  readImageAsDataUrl,
  type MemberFormValues,
  type MemberRecord,
} from "./memberFormUtils";
import { ROLE_LABELS, type PlatformRole } from "./roles";
import { assignableRoles, createManagedUser, type ManagedUser } from "./settings/usersStore";
import { useOrgTree, type OrgSelectionIds } from "./useOrgTree";
import { createMemberRemote, hasRemoteMembers } from "../services/memberService";
import { hasRemoteProfiles, inviteUserRemote } from "../services/profileService";
import { supabase } from "../services/supabaseClient";

const STATUTS = ["Actif", "En attente", "Suspendu"] as const;
const DEPARTEMENTS = ["Homme", "Femme", "Jeune homme", "Jeune fille", "Avenir"] as const;
const MEMBER_RESPONSABILITES = [
  "Membre simple",
  "Responsable groupe",
  "Responsable district",
  "Responsable chapitre",
  "Responsable centre",
] as const;

function platformRoleToMemberResponsabilite(role: PlatformRole): string {
  if (role === "centre" || role === "admin") return "Responsable centre";
  if (role === "chapitre") return "Responsable chapitre";
  if (role === "district") return "Responsable district";
  return "Responsable groupe";
}

export type PersonCreateResult = {
  member: MemberRecord;
  temporaryPassword?: string;
  user?: ManagedUser;
  message: string;
};

type Props = {
  mode: "member" | "responsable";
  actorRole?: PlatformRole;
  variant?: "inline" | "modal";
  open?: boolean;
  initialOrg?: Partial<Pick<MemberFormValues, "chapitre" | "district" | "groupe">>;
  existingMembers?: MemberRecord[];
  onCancel: () => void;
  onSuccess: (result: PersonCreateResult) => void;
};

export default function PersonCreateForm({
  mode,
  actorRole = "centre",
  variant = "inline",
  open = true,
  initialOrg,
  existingMembers = [],
  onCancel,
  onSuccess,
}: Props) {
  const roles = useMemo(() => assignableRoles(actorRole), [actorRole]);
  const orgTree = useOrgTree();
  const [orgIds, setOrgIds] = useState<OrgSelectionIds>({
    chapitreId: "",
    districtId: "",
    groupeId: "",
  });
  const [values, setValues] = useState<MemberFormValues>(() =>
    emptyMemberFormValues({
      chapitre: initialOrg?.chapitre || "",
      district: initialOrg?.district || "",
      groupe: initialOrg?.groupe || "",
      responsabilite: mode === "responsable" ? "Responsable groupe" : "Membre simple",
    }),
  );
  const [platformRole, setPlatformRole] = useState<PlatformRole>(roles[0] || "groupe");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (variant === "modal" && !open) return;
    if (orgTree.loading || orgTree.chapitres.length === 0) return;
    const nextIds = orgTree.coerceSelection(
      orgTree.findByNames({
        chapitre: initialOrg?.chapitre,
        district: initialOrg?.district,
        groupe: initialOrg?.groupe,
      }),
    );
    const names = orgTree.nameOf(nextIds);
    setOrgIds(nextIds);
    setValues(
      emptyMemberFormValues({
        chapitre: names.chapitre,
        district: names.district,
        groupe: names.groupe,
        responsabilite:
          mode === "responsable"
            ? platformRoleToMemberResponsabilite(roles[0] || "groupe")
            : "Membre simple",
      }),
    );
    setPlatformRole(roles[0] || "groupe");
    setError(null);
  }, [
    open,
    mode,
    initialOrg?.chapitre,
    initialOrg?.district,
    initialOrg?.groupe,
    roles,
    variant,
    orgTree.loading,
    orgTree.chapitres,
    orgTree.coerceSelection,
    orgTree.findByNames,
    orgTree.nameOf,
  ]);

  const districtOptions = useMemo(
    () => orgTree.districtsForChapitreId(orgIds.chapitreId),
    [orgTree, orgIds.chapitreId],
  );
  const groupeOptions = useMemo(
    () => orgTree.groupesForDistrictId(orgIds.districtId),
    [orgTree, orgIds.districtId],
  );

  const applyOrgSelection = (next: OrgSelectionIds) => {
    const coerced = orgTree.coerceSelection(next);
    const names = orgTree.nameOf(coerced);
    setOrgIds(coerced);
    setValues((prev) => ({
      ...prev,
      chapitre: names.chapitre,
      district: names.district,
      groupe: names.groupe,
    }));
  };

  if (variant === "modal" && !open) return null;

  const patch = (partial: Partial<MemberFormValues>) => {
    setValues((prev) => ({ ...prev, ...partial }));
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image (JPG, PNG, WEBP…).");
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setError("La photo ne doit pas dépasser 2,5 Mo.");
      return;
    }
    try {
      const photo = await readImageAsDataUrl(file);
      patch({ photo });
      setError(null);
    } catch {
      setError("Impossible de lire la photo. Réessayez.");
    }
  };

  const handlePlatformRoleChange = (role: PlatformRole) => {
    setPlatformRole(role);
    patch({ responsabilite: platformRoleToMemberResponsabilite(role) });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!values.prenom.trim() || !values.nom.trim() || !values.email.trim()) {
      setError("Le prénom, le nom et l’e-mail sont obligatoires.");
      return;
    }
    if (!orgIds.chapitreId || !orgIds.districtId || !orgIds.groupeId) {
      setError(
        orgTree.loading
          ? "Chargement de l’organisation…"
          : "Chapitre, district et groupe sont obligatoires.",
      );
      return;
    }

    setLoading(true);
    try {
      const fullName = `${values.prenom.trim()} ${values.nom.trim()}`.trim();
      let remoteId: string | undefined;
      let temporaryPassword: string | undefined;
      let user: ManagedUser | undefined;
      let message =
        mode === "responsable" ? "Responsable créé avec un espace de connexion." : "Membre enregistré.";

      const memberValues: MemberFormValues = {
        ...values,
        responsabilite:
          mode === "responsable"
            ? platformRoleToMemberResponsabilite(platformRole)
            : values.responsabilite,
      };

      if (hasRemoteMembers()) {
        const { data, error: memberError } = await createMemberRemote(memberValues, {
          chapitre_id: orgIds.chapitreId,
          district_id: orgIds.districtId,
          groupe_id: orgIds.groupeId,
        });
        if (memberError || !data) throw memberError || new Error("Création du membre impossible.");
        remoteId = data.id;
      }

      if (mode === "responsable") {
        // Admin : pas de rattachement.
        // Centre : les 3 IDs ou aucun.
        // Chapitre / district / groupe : chapitre + district + groupe d’appartenance.
        const isAdminRole = platformRole === "admin";
        const isCentreRole = platformRole === "centre";
        const hasFullOrg = Boolean(orgIds.chapitreId && orgIds.districtId && orgIds.groupeId);
        const orgPayload = isAdminRole
          ? { chapitre_id: null as string | null, district_id: null as string | null, groupe_id: null as string | null }
          : isCentreRole && !hasFullOrg
            ? { chapitre_id: null, district_id: null, groupe_id: null }
            : {
                chapitre_id: orgIds.chapitreId,
                district_id: orgIds.districtId,
                groupe_id: orgIds.groupeId,
              };

        if (hasRemoteProfiles()) {
          if (!isAdminRole && !isCentreRole && !hasFullOrg) {
            throw new Error("Chapitre, district et groupe sont obligatoires pour ce rôle.");
          }
          if (isCentreRole) {
            const partial =
              Boolean(orgIds.chapitreId) !== Boolean(orgIds.districtId) ||
              Boolean(orgIds.districtId) !== Boolean(orgIds.groupeId);
            if (partial) {
              throw new Error(
                "Pour rattacher un responsable centre, choisissez chapitre, district et groupe (ou laissez vide).",
              );
            }
          }

          const { data, error: remoteError } = await inviteUserRemote({
            email: memberValues.email,
            full_name: fullName,
            role: platformRole,
            status: "actif",
            skip_email_confirm: true,
            telephone: memberValues.telephone,
            department: memberValues.departement || memberValues.groupe || memberValues.chapitre,
            ...orgPayload,
            member_id: remoteId || null,
          });
          if (remoteError || !data) throw remoteError || new Error("Création du compte impossible.");
          temporaryPassword = data.temporaryPassword;
          message = data.message || message;

          const isJeune =
            memberValues.departement === "Jeune homme" || memberValues.departement === "Jeune fille";
          if (supabase) {
            await supabase
              .from("profiles")
              .update({
                prenom: memberValues.prenom.trim(),
                nom: memberValues.nom.trim(),
                full_name: fullName,
                telephone: memberValues.telephone.trim(),
                department: memberValues.departement || "Homme",
                quartier: memberValues.quartier.trim(),
                date_naissance: memberValues.dateNaissance || null,
                date_debut_pratique: memberValues.dateDebutPratique || null,
                sokahan: isJeune ? Boolean(memberValues.sokahan) : false,
                abonnement_vague_paix: Boolean(memberValues.abonnementVaguePaix),
                abonnement: Boolean(memberValues.abonnement),
                photo_url: memberValues.photo?.startsWith("http") ? memberValues.photo : "",
                // Renforce la persistance org (évite un profil sans groupe après création).
                ...orgPayload,
              })
              .eq("id", data.profile.id);
          }

          const statusMap: Record<string, ManagedUser["status"]> = {
            actif: "Actif",
            en_attente: "En attente",
            suspendu: "Suspendu",
          };
          user = {
            id: Date.now(),
            remoteId: data.profile.id,
            name: fullName,
            prenom: memberValues.prenom.trim(),
            nom: memberValues.nom.trim(),
            email: data.profile.email,
            role: data.profile.role as PlatformRole,
            status: statusMap[data.profile.status] || "Actif",
            chapitre: hasFullOrg ? memberValues.chapitre : "",
            district: hasFullOrg ? memberValues.district : "",
            groupe: hasFullOrg ? memberValues.groupe : "",
            department: memberValues.departement || "Homme",
            telephone: memberValues.telephone,
            quartier: memberValues.quartier,
            bio: "",
            photo: memberValues.photo || "",
            dateNaissance: memberValues.dateNaissance,
            dateDebutPratique: memberValues.dateDebutPratique,
            sokahan: isJeune ? Boolean(memberValues.sokahan) : false,
            abonnementVaguePaix: Boolean(memberValues.abonnementVaguePaix),
            abonnement: Boolean(memberValues.abonnement),
            activatedAt: new Date().toISOString(),
            chapitreId: data.profile.chapitre_id ?? orgPayload.chapitre_id,
            districtId: data.profile.district_id ?? orgPayload.district_id,
            groupeId: data.profile.groupe_id ?? orgPayload.groupe_id,
          };
        } else {
          const result = createManagedUser({
            name: fullName,
            email: memberValues.email,
            role: platformRole,
            chapitre: hasFullOrg ? memberValues.chapitre : undefined,
            district: hasFullOrg ? memberValues.district : undefined,
            groupe: hasFullOrg ? memberValues.groupe : undefined,
            telephone: memberValues.telephone,
            department: memberValues.departement,
          });
          temporaryPassword = result.temporaryPassword;
          user = result.user;
          message = "Responsable créé (espace local).";
        }
      }

      const member = createMemberFromForm(memberValues, existingMembers, remoteId);
      onSuccess({ member, temporaryPassword, user, message });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l’enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const formBody = (
    <form
      onSubmit={handleSubmit}
      className={
        variant === "modal"
          ? "grid max-h-[75vh] gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2"
          : "grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2"
      }
    >
      {error && (
        <div className="rounded-lg border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 px-3 py-2 text-sm text-[var(--sgi-red-deep)] md:col-span-2">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-[var(--sgi-blue)]/25 bg-secondary/40 p-4 md:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Photo</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <MemberAvatar
            photo={values.photo}
            prenom={values.prenom || "N"}
            nom={values.nom || "M"}
            size="xl"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
              <Camera size={15} />
              {values.photo ? "Changer la photo" : "Ajouter une photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
            {values.photo && (
              <button
                type="button"
                onClick={() => patch({ photo: "" })}
                className="ml-0 block text-sm font-medium text-[var(--sgi-red)] hover:underline sm:ml-3 sm:inline"
              >
                Retirer la photo
              </button>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP — 2,5 Mo max.</p>
          </div>
        </div>
      </div>

      <Field label="Prénom">
        <input
          required
          value={values.prenom}
          onChange={(e) => patch({ prenom: e.target.value })}
          className="dash-field"
        />
      </Field>
      <Field label="Nom">
        <input
          required
          value={values.nom}
          onChange={(e) => patch({ nom: e.target.value })}
          className="dash-field"
        />
      </Field>
      <Field label="Email">
        <input
          required
          type="email"
          value={values.email}
          onChange={(e) => patch({ email: e.target.value })}
          className="dash-field"
        />
      </Field>
      <Field label="Téléphone">
        <input
          value={values.telephone}
          onChange={(e) => patch({ telephone: e.target.value })}
          className="dash-field"
        />
      </Field>
      <Field label="Date de naissance">
        <input
          type="date"
          value={values.dateNaissance}
          onChange={(e) => patch({ dateNaissance: e.target.value })}
          className="dash-field"
        />
      </Field>
      <Field label="Département">
        <select
          value={values.departement || "Homme"}
          onChange={(e) => {
            const next = e.target.value;
            const isJeune = next === "Jeune homme" || next === "Jeune fille";
            patch({
              departement: next,
              categorie: next,
              sokahan: isJeune ? values.sokahan : false,
            });
          }}
          className="dash-field"
        >
          {DEPARTEMENTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>

      {(values.departement === "Jeune homme" || values.departement === "Jeune fille") && (
        <Field label="Sokahan" hint="Cochez si la personne possède le Gohonzon.">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={values.sokahan}
              onChange={(e) => patch({ sokahan: e.target.checked })}
            />
            Sokahan
          </label>
        </Field>
      )}

      {mode === "responsable" ? (
        <Field label="Espace / rôle plateforme" hint="Un compte de connexion sera créé avec un mot de passe temporaire.">
          <select
            value={platformRole}
            onChange={(e) => handlePlatformRoleChange(e.target.value as PlatformRole)}
            className="dash-field"
          >
            {roles.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABELS[item]}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Responsabilité" hint="Fiche membre uniquement — aucun compte de connexion n’est créé.">
          <select
            value={values.responsabilite}
            onChange={(e) => patch({ responsabilite: e.target.value })}
            className="dash-field"
          >
            {MEMBER_RESPONSABILITES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Date de début de pratique">
        <input
          type="date"
          value={values.dateDebutPratique}
          onChange={(e) => patch({ dateDebutPratique: e.target.value })}
          className="dash-field"
        />
      </Field>
      <Field label="Quartier / lieu de résidence">
        <input
          value={values.quartier}
          onChange={(e) => patch({ quartier: e.target.value })}
          className="dash-field"
        />
      </Field>
      <Field label="Chapitre">
        <select
          value={orgIds.chapitreId}
          disabled={orgTree.loading || orgTree.chapitres.length === 0}
          onChange={(e) =>
            applyOrgSelection({
              chapitreId: e.target.value,
              districtId: "",
              groupeId: "",
            })
          }
          className="dash-field"
        >
          {orgTree.loading && <option value="">Chargement…</option>}
          {!orgTree.loading && orgTree.chapitres.length === 0 && (
            <option value="">Aucun chapitre</option>
          )}
          {orgTree.chapitres.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="District">
        <select
          value={orgIds.districtId}
          disabled={orgTree.loading || districtOptions.length === 0}
          onChange={(e) =>
            applyOrgSelection({
              chapitreId: orgIds.chapitreId,
              districtId: e.target.value,
              groupeId: "",
            })
          }
          className="dash-field"
        >
          {districtOptions.length === 0 && <option value="">Aucun district</option>}
          {districtOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Groupe">
        <select
          value={orgIds.groupeId}
          disabled={orgTree.loading || groupeOptions.length === 0}
          onChange={(e) =>
            applyOrgSelection({
              chapitreId: orgIds.chapitreId,
              districtId: orgIds.districtId,
              groupeId: e.target.value,
            })
          }
          className="dash-field"
        >
          {groupeOptions.length === 0 && <option value="">Aucun groupe</option>}
          {groupeOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      {orgTree.error && (
        <p className="md:col-span-2 text-sm text-destructive">{orgTree.error}</p>
      )}
      <Field label="Statut">
        <select
          value={values.statut}
          onChange={(e) => patch({ statut: e.target.value })}
          className="dash-field"
        >
          {STATUTS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>

      <div className="flex flex-wrap gap-4 md:col-span-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={values.abonnementVaguePaix}
            onChange={(e) => patch({ abonnementVaguePaix: e.target.checked })}
          />
          Abonnement Vague de Paix
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={values.abonnement}
            onChange={(e) => patch({ abonnement: e.target.checked })}
          />
          Abonné au service / newsletter
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2 md:col-span-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/60"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {mode === "responsable" ? <UserPlus size={14} /> : <Plus size={14} />}
          {loading ? "Enregistrement…" : mode === "responsable" ? "Créer le responsable" : "Enregistrer le membre"}
        </button>
      </div>
    </form>
  );

  if (variant === "inline") return formBody;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/40 p-4 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserPlus size={16} className="text-[var(--sgi-blue)]" />
              Ajouter un responsable
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Même fiche que l’ajout de membre. Un espace de connexion et un mot de passe temporaire seront générés.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
        {formBody}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
