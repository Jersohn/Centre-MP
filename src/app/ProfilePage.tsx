import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Target,
  UserRound,
} from "lucide-react";
import type { PlatformRole } from "./roles";
import { ROLE_LABELS } from "./roles";
import { PROFILE_UPDATED_EVENT, type ProfileStatus, type UserProfile } from "./profilesData";
import { MemberAvatar } from "./MemberAvatar";
import { canManageOrgScope, orgFieldsForRole } from "./orgAccess";
import { useOrgTree, type OrgSelectionIds } from "./useOrgTree";
import { formatFcfa } from "./zaimuQuota";
import { fetchMyProfile, hasRemoteProfiles, updateProfileRemote } from "../services/profileService";
import {
  listMyAssignedSpecialCampaigns,
  type AssignedCampaignCard,
} from "../services/quotaService";
import { uploadProfileAvatar } from "../services/mediaUpload";
import { supabase } from "../services/supabaseClient";

function notifyProfileUpdated(detail: { name?: string; photo?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail }));
}

type Props = {
  role: PlatformRole;
};

const DEPARTEMENTS = ["Homme", "Femme", "Jeune homme", "Jeune fille", "Avenir"] as const;

const EMPTY_PROFILE = (role: PlatformRole): UserProfile => ({
  id: 0,
  name: "",
  prenom: "",
  nom: "",
  email: "",
  role,
  status: "Actif",
  chapitre: "",
  district: "",
  groupe: "",
  department: "Homme",
  telephone: "",
  quartier: "",
  bio: "",
  photo: "",
  dateNaissance: "",
  dateDebutPratique: "",
  sokahan: false,
  abonnementVaguePaix: false,
  abonnement: false,
});

const DB_TO_STATUS: Record<string, ProfileStatus> = {
  actif: "Actif",
  en_attente: "En attente",
  suspendu: "Suspendu",
};

function splitFullName(fullName: string): { prenom: string; nom: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { prenom: "", nom: "" };
  if (parts.length === 1) return { prenom: parts[0], nom: "" };
  return { prenom: parts[0], nom: parts.slice(1).join(" ") };
}

async function loadOrgLabels(ids: {
  chapitre_id: string | null;
  district_id: string | null;
  groupe_id: string | null;
}) {
  if (!supabase) return { chapitre: "", district: "", groupe: "" };
  const [chapitre, district, groupe] = await Promise.all([
    ids.chapitre_id
      ? supabase.from("chapitres").select("name").eq("id", ids.chapitre_id).maybeSingle()
      : Promise.resolve({ data: null }),
    ids.district_id
      ? supabase.from("districts").select("name").eq("id", ids.district_id).maybeSingle()
      : Promise.resolve({ data: null }),
    ids.groupe_id
      ? supabase.from("groupes").select("name").eq("id", ids.groupe_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    chapitre: chapitre.data?.name || "",
    district: district.data?.name || "",
    groupe: groupe.data?.name || "",
  };
}

export default function ProfilePage({ role }: Props) {
  const orgTree = useOrgTree();
  const [profile, setProfile] = useState<UserProfile>(() => EMPTY_PROFILE(role));
  const [remoteId, setRemoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [infoError, setInfoError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [orgUnassigned, setOrgUnassigned] = useState(true);
  const [orgIds, setOrgIds] = useState<OrgSelectionIds>({
    chapitreId: "",
    districtId: "",
    groupeId: "",
  });
  const canEditOwnOrg = canManageOrgScope(role, role, true);
  const orgFields = orgFieldsForRole(role);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdOk, setPwdOk] = useState("");
  const [assignedCampaigns, setAssignedCampaigns] = useState<AssignedCampaignCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setInfoError("");
      if (!hasRemoteProfiles()) {
        if (!cancelled) {
          setProfile(EMPTY_PROFILE(role));
          setRemoteId(null);
          setAssignedCampaigns([]);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await fetchMyProfile();
      if (cancelled) return;
      if (error || !data) {
        setInfoError(error?.message || "Profil introuvable.");
        setProfile(EMPTY_PROFILE(role));
        setRemoteId(null);
        setAssignedCampaigns([]);
        setLoading(false);
        return;
      }

      const split = splitFullName(data.full_name || "");
      const prenom = data.prenom?.trim() || split.prenom;
      const nom = data.nom?.trim() || split.nom;
      const org = await loadOrgLabels({
        chapitre_id: data.chapitre_id,
        district_id: data.district_id,
        groupe_id: data.groupe_id,
      });
      if (cancelled) return;

      const department =
        data.department && DEPARTEMENTS.includes(data.department as (typeof DEPARTEMENTS)[number])
          ? data.department
          : "Homme";

      const chapitre = org.chapitre || data.chapitre_name || "";
      const district = org.district || data.district_name || "";
      const groupe = org.groupe || data.groupe_name || "";
      setRemoteId(data.id);
      setOrgUnassigned(!data.chapitre_id && !data.district_id && !data.groupe_id);
      setOrgIds({
        chapitreId: data.chapitre_id || "",
        districtId: data.district_id || "",
        groupeId: data.groupe_id || "",
      });
      setProfile({
        id: 0,
        name: data.full_name || `${prenom} ${nom}`.trim(),
        prenom,
        nom,
        email: data.email,
        role: data.role,
        status: DB_TO_STATUS[data.status] || "Actif",
        chapitre,
        district,
        groupe,
        department,
        telephone: data.telephone || "",
        quartier: data.quartier || "",
        bio: data.bio || "",
        photo: data.photo_url || "",
        dateNaissance: data.date_naissance || "",
        dateDebutPratique: data.date_debut_pratique || "",
        sokahan: Boolean(data.sokahan),
        abonnementVaguePaix: Boolean(data.abonnement_vague_paix),
        abonnement: Boolean(data.abonnement),
      });

      const assigned = await listMyAssignedSpecialCampaigns({
        role: data.role,
        chapitre_id: data.chapitre_id,
        district_id: data.district_id,
        groupe_id: data.groupe_id,
      });
      if (!cancelled) {
        setAssignedCampaigns(assigned.data);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const patch = (partial: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  const saveProfile = async () => {
    const prenom = (profile.prenom || "").trim();
    const nom = (profile.nom || "").trim();
    const fullName = `${prenom} ${nom}`.trim() || profile.name.trim();
    if (!fullName || !profile.email.trim()) {
      setInfoError("Le prénom, le nom et l’e-mail sont obligatoires.");
      return;
    }
    if (!profile.email.includes("@")) {
      setInfoError("Adresse e-mail invalide.");
      return;
    }
    setInfoError("");
    if (!hasRemoteProfiles() || !supabase || !remoteId) {
      setInfoError("Impossible d’enregistrer le profil pour le moment.");
      return;
    }

    const isJeune = profile.department === "Jeune homme" || profile.department === "Jeune fille";
    const { error } = await supabase
      .from("profiles")
      .update({
        prenom,
        nom,
        full_name: fullName,
        telephone: profile.telephone.trim(),
        department: profile.department || "Homme",
        quartier: profile.quartier.trim(),
        bio: profile.bio.trim(),
        photo_url: profile.photo || "",
        date_naissance: profile.dateNaissance || null,
        date_debut_pratique: profile.dateDebutPratique || null,
        sokahan: isJeune ? Boolean(profile.sokahan) : false,
        abonnement_vague_paix: Boolean(profile.abonnementVaguePaix),
        abonnement: Boolean(profile.abonnement),
      })
      .eq("id", remoteId);

    if (error) {
      setInfoError(error.message);
      return;
    }

    let persistedOrg = {
      chapitre: profile.chapitre,
      district: profile.district,
      groupe: profile.groupe,
    };

    if (canEditOwnOrg && remoteId) {
      try {
        if (orgFields.optionalAttachment && orgUnassigned) {
          const { error: orgError } = await updateProfileRemote({
            user_id: remoteId,
            chapitre_id: null,
            district_id: null,
            groupe_id: null,
          });
          if (orgError) throw orgError;
          persistedOrg = { chapitre: "", district: "", groupe: "" };
          setOrgIds({ chapitreId: "", districtId: "", groupeId: "" });
        } else if (orgFields.chapitre) {
          const selection = orgTree.coerceSelection(orgIds);
          if (orgFields.chapitre && !selection.chapitreId) {
            throw new Error("Sélectionnez un chapitre.");
          }
          if (orgFields.district && !selection.districtId) {
            throw new Error("Sélectionnez un district.");
          }
          if (orgFields.groupe && !selection.groupeId) {
            throw new Error("Sélectionnez un groupe.");
          }
          const { data: orgProfile, error: orgError } = await updateProfileRemote({
            user_id: remoteId,
            chapitre_id: orgFields.chapitre ? selection.chapitreId : null,
            district_id: orgFields.district ? selection.districtId : null,
            groupe_id: orgFields.groupe ? selection.groupeId : null,
          });
          if (orgError) throw orgError;
          const names = orgTree.nameOf(selection);
          persistedOrg = {
            chapitre: orgProfile?.chapitre_name || names.chapitre,
            district: orgProfile?.district_name || names.district,
            groupe: orgProfile?.groupe_name || names.groupe,
          };
          setOrgIds(selection);
        }
      } catch (orgErr) {
        setInfoError(
          orgErr instanceof Error
            ? orgErr.message
            : "Profil enregistré, mais le rattachement org a échoué.",
        );
        return;
      }
    }

    setProfile((prev) => ({
      ...prev,
      name: fullName,
      prenom,
      nom,
      ...persistedOrg,
      sokahan: isJeune ? Boolean(prev.sokahan) : false,
    }));
    notifyProfileUpdated({ name: fullName, photo: profile.photo || "" });
    setSavedFlash("Profil mis à jour avec succès.");
    window.setTimeout(() => setSavedFlash(null), 2800);
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!hasRemoteProfiles() || !supabase || !remoteId) {
      setInfoError("Impossible de téléverser la photo pour le moment.");
      return;
    }
    setPhotoUploading(true);
    setInfoError("");
    try {
      const url = await uploadProfileAvatar(file);
      const { error } = await supabase
        .from("profiles")
        .update({ photo_url: url })
        .eq("id", remoteId);
      if (error) throw error;
      setProfile((prev) => ({ ...prev, photo: url }));
      notifyProfileUpdated({ photo: url });
      setSavedFlash("Photo de profil mise à jour.");
      window.setTimeout(() => setSavedFlash(null), 2800);
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : "Échec du téléversement.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!hasRemoteProfiles() || !supabase || !remoteId) return;
    setPhotoUploading(true);
    setInfoError("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ photo_url: "" })
        .eq("id", remoteId);
      if (error) throw error;
      setProfile((prev) => ({ ...prev, photo: "" }));
      notifyProfileUpdated({ photo: "" });
      setSavedFlash("Photo retirée.");
      window.setTimeout(() => setSavedFlash(null), 2800);
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : "Impossible de retirer la photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const changePassword = async () => {
    setPwdOk("");
    setPwdError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError("Renseignez tous les champs du mot de passe.");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    if (newPassword === currentPassword) {
      setPwdError("Choisissez un mot de passe différent de l’actuel.");
      return;
    }
    if (!supabase || !profile.email) {
      setPwdError("Impossible de changer le mot de passe pour le moment.");
      return;
    }
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });
    if (signError) {
      setPwdError("Mot de passe actuel incorrect.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwdError(error.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwdOk("Mot de passe modifié avec succès.");
    window.setTimeout(() => setPwdOk(""), 2800);
  };

  const isJeune = profile.department === "Jeune homme" || profile.department === "Jeune fille";

  if (loading) {
    return (
      <div className="dash-page">
        <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          Chargement du profil…
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page gap-5 sm:gap-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
        <div
          className="relative px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 0% 0%, rgba(200,151,26,0.18), transparent 55%), radial-gradient(ellipse 70% 100% at 100% 0%, rgba(10,47,82,0.16), transparent 50%), linear-gradient(180deg, color-mix(in srgb, var(--sgi-blue) 8%, transparent), transparent)",
          }}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative">
                <MemberAvatar
                  photo={profile.photo}
                  name={profile.name || profile.email}
                  size="xl"
                  className="!h-20 !w-20 !text-2xl shadow-lg ring-4 ring-[var(--sgi-gold)]/30 sm:!h-24 sm:!w-24 sm:!text-3xl"
                />
                <button
                  type="button"
                  disabled={photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-[var(--sgi-gold)] text-[var(--sgi-blue-deep)] shadow-sm transition hover:brightness-105 disabled:opacity-60"
                  aria-label="Changer la photo"
                  title="Changer la photo"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handlePhotoChange(e)}
                />
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--sgi-gold)]">
                  Mon espace personnel
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {profile.name || "Profil"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{ROLE_LABELS[role]}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      profile.status === "Actif"
                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                        : profile.status === "En attente"
                          ? "bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]"
                          : "bg-[var(--sgi-red)]/12 text-[var(--sgi-red)]"
                    }`}
                  >
                    {profile.status}
                  </span>
                  {profile.department && (
                    <span className="rounded-full bg-[var(--sgi-blue)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--sgi-blue)]">
                      {profile.department}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:max-w-xs">
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2 backdrop-blur">
                <Mail size={14} className="text-[var(--sgi-blue)]" />
                <span className="truncate text-foreground">{profile.email || "—"}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2 backdrop-blur">
                <Phone size={14} className="text-[var(--sgi-gold)]" />
                <span className="text-foreground">{profile.telephone || "—"}</span>
              </div>
              <div className="inline-flex items-start gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2 backdrop-blur">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--sgi-red)]" />
                <span className="text-foreground">
                  {[profile.chapitre, profile.district, profile.groupe].filter(Boolean).join(" · ") ||
                    "Aucun rattachement"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(savedFlash || pwdOk) && (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={16} />
          {savedFlash || pwdOk}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]">
                <UserRound size={18} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Informations du profil</h3>
                <p className="text-xs text-muted-foreground">
                  Complétez les champs manquants de votre fiche (mêmes informations que l’ajout de membre).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            {infoError && (
              <div className="rounded-xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 px-3 py-2 text-sm text-[var(--sgi-red-deep)] dark:text-[var(--sgi-red-soft)]">
                {infoError}
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
              <MemberAvatar photo={profile.photo} name={profile.name || profile.email} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Photo de profil</p>
                <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP — 2,5 Mo max.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={photoUploading}
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                  >
                    <Camera size={14} />
                    {photoUploading ? "Téléversement…" : profile.photo ? "Changer la photo" : "Ajouter une photo"}
                  </button>
                  {profile.photo && (
                    <button
                      type="button"
                      disabled={photoUploading}
                      onClick={() => void removePhoto()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-60"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Prénom">
                <input
                  value={profile.prenom || ""}
                  onChange={(e) => patch({ prenom: e.target.value })}
                  className="dash-field"
                />
              </Field>
              <Field label="Nom">
                <input
                  value={profile.nom || ""}
                  onChange={(e) => patch({ nom: e.target.value })}
                  className="dash-field"
                />
              </Field>
              <Field label="E-mail">
                <input value={profile.email} disabled className="dash-field opacity-70" />
              </Field>
              <Field label="Téléphone">
                <input
                  value={profile.telephone}
                  onChange={(e) => patch({ telephone: e.target.value })}
                  className="dash-field"
                />
              </Field>
              <Field label="Date de naissance">
                <input
                  type="date"
                  value={profile.dateNaissance || ""}
                  onChange={(e) => patch({ dateNaissance: e.target.value })}
                  className="dash-field"
                />
              </Field>
              <Field label="Département">
                <select
                  value={profile.department || "Homme"}
                  onChange={(e) => {
                    const next = e.target.value;
                    const jeune = next === "Jeune homme" || next === "Jeune fille";
                    patch({
                      department: next,
                      sokahan: jeune ? profile.sokahan : false,
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

              {isJeune && (
                <Field label="Sokahan" hint="Cochez si vous possédez le Gohonzon.">
                  <label className="flex items-center gap-2 rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(profile.sokahan)}
                      onChange={(e) => patch({ sokahan: e.target.checked })}
                    />
                    Sokahan
                  </label>
                </Field>
              )}

              <Field label="Date de début de pratique">
                <input
                  type="date"
                  value={profile.dateDebutPratique || ""}
                  onChange={(e) => patch({ dateDebutPratique: e.target.value })}
                  className="dash-field"
                />
              </Field>
              <Field label="Quartier / lieu de résidence">
                <input
                  value={profile.quartier}
                  onChange={(e) => patch({ quartier: e.target.value })}
                  className="dash-field"
                />
              </Field>
              {canEditOwnOrg ? (
                <>
                  {orgFields.optionalAttachment && (
                    <Field label="Rattachement" hint="Vous pouvez vous rattacher à un groupe tout en restant responsable centre.">
                      <label className="flex items-center gap-2 rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={orgUnassigned}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setOrgUnassigned(next);
                            if (!next) {
                              const selection = orgTree.coerceSelection(
                                orgIds.chapitreId ? orgIds : orgTree.defaultSelection,
                              );
                              setOrgIds(selection);
                              setProfile((prev) => ({ ...prev, ...orgTree.nameOf(selection) }));
                            }
                          }}
                        />
                        Aucun rattachement de groupe
                      </label>
                    </Field>
                  )}
                  {orgTree.error && (
                    <p className="md:col-span-2 text-sm text-destructive">{orgTree.error}</p>
                  )}
                  {!orgUnassigned && orgFields.chapitre && (
                    <Field label="Chapitre">
                      <select
                        value={orgIds.chapitreId}
                        disabled={orgTree.loading || orgTree.chapitres.length === 0}
                        onChange={(e) => {
                          const next = orgTree.coerceSelection({
                            chapitreId: e.target.value,
                            districtId: "",
                            groupeId: "",
                          });
                          setOrgIds(next);
                          setProfile((prev) => ({ ...prev, ...orgTree.nameOf(next) }));
                        }}
                        className="dash-field"
                      >
                        {orgTree.loading && <option value="">Chargement…</option>}
                        {orgTree.chapitres.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {!orgUnassigned && orgFields.district && (
                    <Field label="District">
                      <select
                        value={orgIds.districtId}
                        disabled={orgTree.loading || !orgIds.chapitreId}
                        onChange={(e) => {
                          const next = orgTree.coerceSelection({
                            chapitreId: orgIds.chapitreId,
                            districtId: e.target.value,
                            groupeId: "",
                          });
                          setOrgIds(next);
                          setProfile((prev) => ({ ...prev, ...orgTree.nameOf(next) }));
                        }}
                        className="dash-field"
                      >
                        {orgTree.districtsForChapitreId(orgIds.chapitreId).map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {!orgUnassigned && orgFields.groupe && (
                    <Field label="Groupe">
                      <select
                        value={orgIds.groupeId}
                        disabled={orgTree.loading || !orgIds.districtId}
                        onChange={(e) => {
                          const next = {
                            chapitreId: orgIds.chapitreId,
                            districtId: orgIds.districtId,
                            groupeId: e.target.value,
                          };
                          setOrgIds(next);
                          setProfile((prev) => ({ ...prev, ...orgTree.nameOf(next) }));
                        }}
                        className="dash-field"
                      >
                        {orgTree.groupesForDistrictId(orgIds.districtId).map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                </>
              ) : (
                <>
                  <Field label="Chapitre">
                    <input value={profile.chapitre || "—"} disabled className="dash-field opacity-70" />
                  </Field>
                  <Field label="District">
                    <input value={profile.district || "—"} disabled className="dash-field opacity-70" />
                  </Field>
                  <Field label="Groupe">
                    <input value={profile.groupe || "—"} disabled className="dash-field opacity-70" />
                  </Field>
                </>
              )}
              <Field label="Rôle">
                <div className="dash-field inline-flex items-center gap-2 opacity-80">
                  <Shield size={14} /> {ROLE_LABELS[role]}
                </div>
              </Field>
              <Field label="Statut">
                <input value={profile.status} disabled className="dash-field opacity-70" />
              </Field>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(profile.abonnementVaguePaix)}
                  onChange={(e) => patch({ abonnementVaguePaix: e.target.checked })}
                />
                Abonnement Vague de Paix
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(profile.abonnement)}
                  onChange={(e) => patch({ abonnement: e.target.checked })}
                />
                Abonné au service / newsletter
              </label>
            </div>

            <Field label="Bio">
              <textarea
                value={profile.bio}
                onChange={(e) => patch({ bio: e.target.value })}
                rows={4}
                className="dash-field min-h-[6rem] resize-y"
                placeholder="Présentez-vous brièvement…"
              />
            </Field>

            <button
              type="button"
              onClick={() => void saveProfile()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-medium text-white"
            >
              <Save size={15} /> Enregistrer le profil
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]">
                <KeyRound size={18} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Mot de passe</h3>
                <p className="text-xs text-muted-foreground">Modifiez votre mot de passe de connexion.</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-5 sm:p-6">
            {pwdError && (
              <div className="rounded-xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 px-3 py-2 text-sm text-[var(--sgi-red-deep)]">
                {pwdError}
              </div>
            )}
            <PasswordField
              label="Mot de passe actuel"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
            />
            <PasswordField
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew((v) => !v)}
            />
            <PasswordField
              label="Confirmer"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={false}
              onToggle={() => undefined}
              hideToggle
            />
            <button
              type="button"
              onClick={() => void changePassword()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              <KeyRound size={15} /> Changer le mot de passe
            </button>
            <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <Building2 size={14} className="mt-0.5 shrink-0" />
              Le rôle et le statut sont gérés par l’administrateur / responsable centre.
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              {canEditOwnOrg
                ? "En tant que responsable centre, vous pouvez vous rattacher à un groupe."
                : "Chapitre, district et groupe sont modifiés par votre responsable hiérarchique."}
            </div>
          </div>
        </section>
      </div>

      {(role === "chapitre" || role === "district" || role === "groupe" || role === "centre" || role === "admin") && (
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sgi-red)]/10 text-[var(--sgi-red)]">
                <Target size={18} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Zaimu spécial — cotas reçues
                </h3>
                <p className="text-xs text-muted-foreground">
                  Campagnes assignées à votre périmètre. Répartissez ensuite dans Collectes → Zaimu spécial → Campagnes & cotas.
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {assignedCampaigns.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">
                Aucune campagne zaimu spécial reçue pour le moment.
              </p>
            ) : (
              assignedCampaigns.map((item) => (
                <div
                  key={item.campaign.id}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.campaign.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.orgLabel} ·{" "}
                      {item.level === "groupe"
                        ? "à répartir entre les membres"
                        : "à répartir vers le niveau suivant"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={12} />
                      {item.date_echeance
                        ? new Date(item.date_echeance).toLocaleDateString("fr-FR")
                        : "Sans échéance"}
                    </span>
                    <span className="font-mono font-semibold text-[var(--sgi-red)]">
                      {formatFcfa(item.assigne)} FCFA
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
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

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  hideToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  hideToggle?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="dash-field pr-10"
        />
        {!hideToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label={show ? "Masquer" : "Afficher"}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  );
}
