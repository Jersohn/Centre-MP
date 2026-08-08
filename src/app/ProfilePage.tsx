import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  UserRound,
} from "lucide-react";
import type { PlatformRole } from "./roles";
import { ROLE_LABELS } from "./roles";
import {
  getStoredPassword,
  INITIAL_PROFILES,
  profileInitials,
  setStoredPassword,
  type UserProfile,
} from "./profilesData";

type Props = {
  role: PlatformRole;
};

export default function ProfilePage({ role }: Props) {
  const seed = useMemo(
    () => INITIAL_PROFILES.find((p) => p.role === role) ?? INITIAL_PROFILES[0],
    [role]
  );

  const [profile, setProfile] = useState<UserProfile>(seed);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [infoError, setInfoError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdOk, setPwdOk] = useState("");

  useEffect(() => {
    setProfile(seed);
    setInfoError("");
    setSavedFlash(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwdError("");
    setPwdOk("");
  }, [seed]);

  const initials = profileInitials(profile.name);

  const saveProfile = () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      setInfoError("Le nom et l’e-mail sont obligatoires.");
      return;
    }
    if (!profile.email.includes("@")) {
      setInfoError("Adresse e-mail invalide.");
      return;
    }
    setInfoError("");
    // Persistance locale démo (par rôle)
    window.localStorage.setItem(`sgi-profile:${role}`, JSON.stringify(profile));
    setSavedFlash("Profil mis à jour avec succès.");
    window.setTimeout(() => setSavedFlash(null), 2800);
  };

  const changePassword = () => {
    setPwdOk("");
    setPwdError("");
    const stored = getStoredPassword(role);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError("Renseignez tous les champs du mot de passe.");
      return;
    }
    if (currentPassword !== stored) {
      setPwdError("Mot de passe actuel incorrect.");
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
    setStoredPassword(role, newPassword);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwdOk("Mot de passe modifié avec succès.");
    window.setTimeout(() => setPwdOk(""), 2800);
  };

  // Charger profil sauvegardé
  useEffect(() => {
    const raw = window.localStorage.getItem(`sgi-profile:${role}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as UserProfile;
      if (parsed?.role === role) setProfile({ ...seed, ...parsed, role });
    } catch {
      /* ignore */
    }
  }, [role, seed]);

  return (
    <div className="dash-page gap-5 sm:gap-6">
      {/* Hero */}
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
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--sgi-blue)] text-2xl font-bold text-white shadow-lg ring-4 ring-[var(--sgi-gold)]/30 sm:h-24 sm:w-24 sm:text-3xl">
                  {initials}
                </div>
                <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-[var(--sgi-gold)] text-[var(--sgi-blue-deep)]">
                  <UserRound size={14} />
                </span>
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--sgi-gold)]">
                  Mon espace personnel
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {profile.name}
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
                  <span className="rounded-full bg-[var(--sgi-blue)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--sgi-blue)]">
                    {profile.chapitre}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:max-w-xs">
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2 backdrop-blur">
                <Mail size={14} className="text-[var(--sgi-blue)]" />
                <span className="truncate text-foreground">{profile.email}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2 backdrop-blur">
                <Phone size={14} className="text-[var(--sgi-gold)]" />
                <span className="text-foreground">{profile.telephone || "—"}</span>
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
        {/* Infos */}
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]">
                <UserRound size={18} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Informations du profil</h3>
                <p className="text-xs text-muted-foreground">Consultez et mettez à jour vos coordonnées.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            {infoError && (
              <div className="rounded-xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 px-3 py-2 text-sm text-[var(--sgi-red-deep)] dark:text-[var(--sgi-red-soft)]">
                {infoError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nom complet">
                <input
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  className="dash-field"
                />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  className="dash-field"
                />
              </Field>
              <Field label="Téléphone">
                <input
                  value={profile.telephone}
                  onChange={(e) => setProfile((p) => ({ ...p, telephone: e.target.value }))}
                  className="dash-field"
                />
              </Field>
              <Field label="Quartier / résidence">
                <input
                  value={profile.quartier}
                  onChange={(e) => setProfile((p) => ({ ...p, quartier: e.target.value }))}
                  className="dash-field"
                />
              </Field>
              <Field label="Chapitre / rattachement">
                <input
                  value={profile.chapitre}
                  onChange={(e) => setProfile((p) => ({ ...p, chapitre: e.target.value }))}
                  className="dash-field"
                />
              </Field>
              <Field label="Département">
                <input
                  value={profile.department}
                  onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
                  className="dash-field"
                />
              </Field>
            </div>

            <Field label="Présentation">
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                className="dash-field min-h-[96px] resize-y"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoTile icon={Shield} label="Rôle" value={ROLE_LABELS[role]} />
              <InfoTile icon={Building2} label="Organisation" value={profile.chapitre} />
              <InfoTile icon={MapPin} label="Quartier" value={profile.quartier || "—"} />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={saveProfile}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                <Save size={15} />
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </section>

        {/* Mot de passe */}
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sgi-red)]/10 text-[var(--sgi-red)]">
                <KeyRound size={18} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Sécurité</h3>
                <p className="text-xs text-muted-foreground">Modifier votre mot de passe de connexion.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <div
              className="rounded-2xl border border-border px-4 py-3 text-xs text-muted-foreground"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--sgi-gold) 10%, transparent), transparent)",
              }}
            >
              Mot de passe démo par défaut : <span className="font-mono text-foreground">sgi2026</span>
            </div>

            {pwdError && (
              <div className="rounded-xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 px-3 py-2 text-sm text-[var(--sgi-red-deep)] dark:text-[var(--sgi-red-soft)]">
                {pwdError}
              </div>
            )}

            <PasswordField
              label="Mot de passe actuel"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
            />
            <PasswordField
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={setNewPassword}
              visible={showNew}
              onToggle={() => setShowNew((v) => !v)}
            />
            <PasswordField
              label="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showNew}
              onToggle={() => setShowNew((v) => !v)}
            />

            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• Au moins 6 caractères</li>
              <li>• Différent du mot de passe actuel</li>
              <li>• Confirmation obligatoire</li>
            </ul>

            <button
              type="button"
              onClick={changePassword}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--sgi-red)]/30 bg-[var(--sgi-red)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--sgi-red)] transition hover:bg-[var(--sgi-red)]/15"
            >
              <KeyRound size={15} />
              Mettre à jour le mot de passe
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-3.5">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]">
        <Icon size={14} />
      </div>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="dash-field pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={visible ? "Masquer" : "Afficher"}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </label>
  );
}
