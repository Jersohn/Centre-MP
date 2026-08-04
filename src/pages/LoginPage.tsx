import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import sgiLogo from "../../image/logo-sgi.jpg";
import { hasSupabaseAuth, signInWithEmail } from "../services/authService";

const profiles = [
  { label: "Administrateur", role: "admin", path: "/dashboard/admin" },
  { label: "Responsable centre", role: "centre", path: "/dashboard/centre" },
  { label: "Responsable chapitre", role: "chapitre", path: "/dashboard/chapitre" },
  { label: "Responsable district", role: "district", path: "/dashboard/district" },
  { label: "Responsable groupe", role: "groupe", path: "/dashboard/groupe" },
];

export function LoginPage() {
  const [selectedRole, setSelectedRole] = useState(profiles[0].role);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const hasAuth = hasSupabaseAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasAuth) {
      const profile = profiles.find((item) => item.role === selectedRole);
      if (profile) {
        localStorage.setItem("sgi-current-role", selectedRole);
        navigate(profile.path);
      }
      return;
    }

    const response = await signInWithEmail(email, password);
    if (response.error) {
      setError(response.error.message);
      return;
    }

    localStorage.setItem("sgi-current-role", selectedRole);
    const profile = profiles.find((item) => item.role === selectedRole);
    if (profile) {
      navigate(profile.path);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-4xl grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col justify-center bg-white rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-4">
            <img src={sgiLogo} alt="SGI Logo" className="w-12 h-12 rounded-full object-cover" />
            <div>
              <p className="text-sm font-semibold text-[var(--sgi-gold)]">Soka Gakkai International</p>
              <h1 className="text-2xl font-bold text-foreground">Connexion</h1>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">Accédez à votre espace — sélectionnez votre rôle et connectez-vous rapidement.</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            {hasAuth ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground">Email</label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    className="mt-2 w-full rounded-lg border border-border bg-input-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2"
                    placeholder="votre.email@exemple.com"
                    aria-label="Adresse email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Mot de passe</label>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    className="mt-2 w-full rounded-lg border border-border bg-input-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2"
                    placeholder="••••••••"
                    aria-label="Mot de passe"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-foreground">Choisir un profil</label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                    className="w-full rounded-lg border border-border bg-input-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2"
                    aria-label="Sélection du profil"
                  >
                    {profiles.map((profile) => (
                      <option key={profile.role} value={profile.role}>{profile.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="form-checkbox h-4 w-4 rounded" />
                Se souvenir de moi
              </label>
              <a href="#" className="text-sm text-[var(--sgi-blue)] hover:underline">Mot de passe oublié ?</a>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-[var(--sgi-blue)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95">
              Entrer <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 text-xs text-muted-foreground">Besoin d'aide ? Contactez l'administrateur ou consultez la documentation interne.</div>
          <a href="/" target="_blank" rel="noopener" className="mt-4 inline-block text-sm text-[var(--sgi-blue)] hover:underline">Visiter le site</a>
        </div>

        <aside className="rounded-2xl bg-[linear-gradient(180deg,var(--sgi-blue),#08213d)] p-8 text-white">
          <h2 className="text-lg font-semibold">Accès rapide</h2>
          <p className="mt-3 text-sm text-[var(--sgi-cream)]">Choisissez un rôle pour visualiser les modules pertinents et accéder aux outils administratifs.</p>
          <ul className="mt-6 space-y-3">
            {profiles.map((p) => (
              <li key={p.role} className="flex items-center justify-between rounded-lg bg-white/6 px-4 py-3">
                <span className="text-sm">{p.label}</span>
                <span className="text-xs text-[var(--sgi-gold)]">Voir</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-xs text-[var(--sgi-cream)]">Sécurité: authentification basée sur le rôle. Assurez-vous d'utiliser vos identifiants officiels.</div>
        </aside>
      </div>
    </div>
  );
}
