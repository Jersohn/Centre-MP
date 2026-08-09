import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import sgiLogo from "../../image/logo-sgi.jpg";
import { landingImages } from "../assets/landing/images";
import { hasSupabaseAuth, signInWithEmail } from "../services/authService";
import { fetchMyProfile } from "../services/profileService";
import {
  findUserByEmail,
  loadCredentials,
  verifyCredential,
} from "../app/settings/usersStore";
import { ALLOWED_ROLES, type PlatformRole } from "../app/roles";
import { purgeMockAccountStorage } from "../app/profilesData";
import { DeveloperCredit } from "../components/DeveloperCredit";
import { easeOutSoft } from "../components/landing/motion";

const trustPoints = [
  { label: "Accès sécurisé", detail: "Espace réservé aux responsables" },
  { label: "Par rôle", detail: "Modules adaptés à votre mission" },
  { label: "Côte d’Ivoire", detail: "Centre Miroir Parfait — SGI" },
];

const ROLE_PATH: Record<PlatformRole, string> = {
  admin: "/dashboard/admin",
  centre: "/dashboard/centre",
  chapitre: "/dashboard/chapitre",
  district: "/dashboard/district",
  groupe: "/dashboard/groupe",
};

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const hasAuth = hasSupabaseAuth();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    purgeMockAccountStorage();
    const remembered = window.localStorage.getItem("sgi-remember-email");
    setRememberMe(Boolean(remembered));
    if (remembered) setEmail(remembered);
  }, []);

  const enterWithRole = (role: PlatformRole) => {
    localStorage.setItem("sgi-current-role", role);
    if (rememberMe && email.trim()) localStorage.setItem("sgi-remember-email", email.trim().toLowerCase());
    else {
      localStorage.removeItem("sgi-remember-email");
      localStorage.removeItem("sgi-remember-role");
    }
    navigate(ROLE_PATH[role], { replace: true });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        setError("E-mail et mot de passe requis.");
        return;
      }

      if (!hasAuth) {
        const localUser = findUserByEmail(email);
        if (!localUser || !verifyCredential(email, password)) {
          setError("Identifiants incorrects.");
          return;
        }
        if (localUser.status === "Suspendu") {
          setError("Ce compte est suspendu. Contactez l’administrateur.");
          return;
        }
        if (localUser.status === "En attente") {
          setError("Compte en attente. Ouvrez votre lien d’invitation pour définir le mot de passe.");
          return;
        }
        enterWithRole(localUser.role);
        return;
      }

      const response = await signInWithEmail(email, password);
      if (response.error) {
        setError(response.error.message || "Identifiants incorrects. Réessayez.");
        return;
      }
      if (!response.data?.session) {
        setError("Session non établie. Réessayez ou contactez l’administrateur.");
        return;
      }

      const { data: profile, error: profileError } = await fetchMyProfile();
      if (profileError || !profile) {
        setError(
          profileError?.message
            ? `Profil introuvable : ${profileError.message}`
            : "Profil introuvable. Contactez l’administrateur du centre.",
        );
        return;
      }
      if (profile.status === "suspendu") {
        setError("Ce compte est suspendu. Contactez l’administrateur.");
        return;
      }
      if (profile.status === "en_attente") {
        setError("Compte en attente d’activation. Contactez l’administrateur.");
        return;
      }
      if (!ALLOWED_ROLES.includes(profile.role as PlatformRole)) {
        setError("Rôle non autorisé pour cette plateforme.");
        return;
      }

      enterWithRole(profile.role as PlatformRole);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[var(--sgi-blue-deep)] text-foreground">
      <div className="grid min-h-[100svh] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: easeOutSoft }}
          className="relative flex min-h-[34svh] flex-col justify-between overflow-hidden px-5 py-6 sm:px-8 sm:py-8 lg:min-h-[100svh] lg:px-10 lg:py-10"
        >
          <img
            src={landingImages.heroSlides[1]?.src || landingImages.hero}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--sgi-blue-deep)]/88 via-[var(--sgi-blue)]/78 to-[var(--sgi-blue-deep)]/92" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,151,26,0.22),transparent_45%)]" />

          <div className="relative z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/85 transition hover:text-white"
            >
              <ArrowLeft size={16} /> Retour au site
            </Link>

            <div className="mt-6 flex items-center gap-3">
              <img
                src={sgiLogo}
                alt="Logo SGI"
                className="h-12 w-12 rounded-full border border-white/20 object-cover shadow-lg sm:h-14 sm:w-14"
              />
              <div>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[var(--sgi-gold-soft)]">
                  Soka Gakkai International
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-white sm:text-xl">
                  Centre Miroir Parfait
                </p>
              </div>
            </div>

            <div className="sgi-tricolor-soft mt-5 h-1 w-24 rounded-full" aria-hidden />

            <h1 className="mt-5 max-w-md font-display text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-[2.65rem]">
              Accès réservé aux responsables
            </h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/80 sm:text-base sm:leading-8">
              Connectez-vous avec le compte fourni par l’administrateur.
            </p>
          </div>

          <ul className="relative z-10 mt-8 hidden gap-3 lg:grid">
            {trustPoints.map((point) => (
              <li
                key={point.label}
                className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-sm font-semibold text-white">{point.label}</p>
                <p className="mt-0.5 text-xs text-white/70">{point.detail}</p>
              </li>
            ))}
          </ul>

          <div className="sgi-tricolor absolute bottom-0 left-0 right-0 h-1.5" aria-hidden />
        </motion.aside>

        <motion.main
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: easeOutSoft }}
          className="relative flex items-center justify-center bg-[#f7f8fb] px-4 py-8 sm:px-8 sm:py-12 lg:px-12"
        >
          <div className="w-full max-w-[420px]">
            <div className="mb-7 lg:mb-8">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--sgi-gold)]">
                Portail sécurisé
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[var(--sgi-ink)]">
                Espace responsables
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Connectez-vous avec l’e-mail et le mot de passe fournis par le centre.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-[var(--sgi-ink)]">
                  Email
                </label>
                <input
                  id="login-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-[var(--sgi-ink)] outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/15"
                  placeholder="votre.email@exemple.com"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold text-[var(--sgi-ink)]">
                  Mot de passe
                </label>
                <div className="relative mt-2">
                  <input
                    id="login-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 pr-12 text-sm text-[var(--sgi-ink)] outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/15"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-[var(--sgi-ink)]"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-border text-[var(--sgi-blue)] focus:ring-[var(--sgi-blue)]"
                  />
                  Se souvenir de moi
                </label>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LockKeyhole size={13} className="text-[var(--sgi-gold)]" />
                  Accès sécurisé
                </span>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/8 px-4 py-3 text-sm text-[var(--sgi-red-deep)]"
                >
                  {error}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={reduceMotion || loading ? undefined : { y: -2 }}
                whileTap={reduceMotion || loading ? undefined : { scale: 0.98 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--sgi-red)] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--sgi-red)]/25 transition hover:bg-[var(--sgi-red-deep)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    Connexion… <LoaderCircle size={16} className="animate-spin" />
                  </>
                ) : (
                  <>
                    Se connecter <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
              Besoin d’un compte ? Demandez à l’administrateur du Centre Miroir Parfait.
            </p>

            <div className="mt-4 flex justify-center lg:hidden">
              <Link to="/" className="text-sm font-semibold text-[var(--sgi-blue)] hover:underline">
                Retour au site public
              </Link>
            </div>

            <div className="mt-6 flex justify-center border-t border-border pt-4">
              <DeveloperCredit variant="light" className="text-center" />
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
