import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import sgiLogo from "../../image/logo-sgi.jpg";
import { ROLE_LABELS, type PlatformRole } from "../app/roles";
import { acceptInvite, getInviteByToken } from "../app/settings/usersStore";
import { hasSupabaseAuth } from "../services/authService";
import { supabase } from "../services/supabaseClient";
import { DeveloperCredit } from "../components/DeveloperCredit";

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const hasAuth = hasSupabaseAuth();

  const inviteState = useMemo(() => (token ? getInviteByToken(token) : null), [token]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [activatedRole, setActivatedRole] = useState<PlatformRole | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      if (hasAuth && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setError(
            "Ouvrez le lien reçu par e-mail pour authentifier la session, puis définissez votre mot de passe ici.",
          );
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
          return;
        }

        const { data: activated, error: activateError } = await supabase.rpc("activate_my_profile");
        if (activateError) {
          setError(activateError.message);
          return;
        }

        const activatedRow = Array.isArray(activated) ? activated[0] : activated;
        const role =
          (activatedRow?.role as PlatformRole | undefined) ||
          (sessionData.session.user.app_metadata?.role as PlatformRole | undefined) ||
          "groupe";

        localStorage.setItem("sgi-current-role", role);
        setActivatedRole(role);
        setDone(true);
        return;
      }

      const user = acceptInvite(token, password);
      localStorage.setItem("sgi-current-role", user.role);
      setActivatedRole(user.role);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation impossible.");
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    const role = activatedRole || "groupe";
    navigate(`/dashboard/${role}`, { replace: true });
  };

  return (
    <div className="relative flex min-h-[100svh] items-center justify-center bg-[var(--sgi-blue-deep)] px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 20% 20%, rgba(200,151,26,0.25), transparent 55%), radial-gradient(ellipse 45% 35% at 80% 10%, rgba(255,255,255,0.08), transparent 50%)",
        }}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card shadow-[var(--shadow-lift)]">
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <img src={sgiLogo} alt="SGI" className="h-10 w-10 rounded-full object-cover" />
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--sgi-gold)]">
                Centre Miroir Parfait
              </div>
              <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Activer votre accès
              </h1>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {!token && !hasAuth && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Lien d’invitation invalide. Demandez un nouveau lien à l’administrateur.
            </div>
          )}

          {token && inviteState?.status === "expired" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Cette invitation a expiré. Contactez le responsable centre pour un nouveau lien.
            </div>
          )}

          {token && inviteState?.status === "accepted" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Invitation déjà activée. Vous pouvez vous connecter.
              <div className="mt-3">
                <Link to="/login" className="font-medium text-[var(--sgi-blue)] underline-offset-2 hover:underline">
                  Aller à la connexion
                </Link>
              </div>
            </div>
          )}

          {done ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
              <div>
                <div className="text-base font-semibold text-foreground">Compte activé</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Votre session est prête
                  {activatedRole ? ` en tant que ${ROLE_LABELS[activatedRole]}` : ""}.
                </p>
              </div>
              <button
                type="button"
                onClick={goToDashboard}
                className="w-full rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-medium text-white"
              >
                Ouvrir mon espace
              </button>
            </div>
          ) : (
            <>
              {inviteState?.status === "pending" && inviteState.user && (
                <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm">
                  <div className="font-medium text-foreground">{inviteState.user.name}</div>
                  <div className="text-muted-foreground">{inviteState.user.email}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Rôle : {ROLE_LABELS[inviteState.user.role]}
                  </div>
                </div>
              )}

              {(hasAuth || inviteState?.status === "pending") && (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Nouveau mot de passe</span>
                    <div className="relative">
                      <KeyRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        required
                        minLength={6}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-border bg-input-background py-2.5 pl-9 pr-10 text-sm outline-none"
                        placeholder="Au moins 6 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-label={showPassword ? "Masquer" : "Afficher"}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Confirmer</span>
                    <input
                      required
                      minLength={6}
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none"
                    />
                  </label>
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
                  )}
                  <button
                    type="submit"
                    disabled={loading || (!hasAuth && inviteState?.status !== "pending")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {loading && <LoaderCircle size={16} className="animate-spin" />}
                    Définir mon mot de passe
                  </button>
                </form>
              )}
            </>
          )}

          <div className="pt-2 text-center">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <DeveloperCredit variant="muted" className="text-white/70" />
      </div>
    </div>
  );
}
