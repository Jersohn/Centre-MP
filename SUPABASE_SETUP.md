# Supabase Setup — Centre Miroir Parfait

## 1. Projet

1. Créez un projet sur https://supabase.com (ou réutilisez un projet existant).
2. Notez **Project URL** et **anon public key**.
3. Variables locales / Vercel :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> Ne jamais exposer `service_role` dans Vite / le navigateur.

## 2. Appliquer les migrations

Avec la CLI :

```bash
npm i -g supabase
# ou : npx supabase
supabase login
supabase link --project-ref <VOTRE_REF>
supabase db push
```

Fichiers dans `supabase/migrations/` (fondation sécurisée + seed org + RLS + storage).

Détails architecture : [`docs/BACKEND-SUPABASE.md`](docs/BACKEND-SUPABASE.md).

## 3. Auth

- Désactivez l’inscription publique si seuls les responsables ont un compte (`config.toml` : `enable_signup = false`).
- Créez les utilisateurs dans le Dashboard, puis rattachez rôle / chapitre / district / groupe dans `public.profiles`.
- Un trigger crée un profil `en_attente` à chaque nouvel utilisateur Auth.

Premier admin (SQL Editor) :

```sql
update public.profiles
set role = 'admin', status = 'actif', full_name = 'Administrateur'
where email = 'votre@email.com';
```

## 4. Edge Functions

```bash
supabase secrets set GROQ_API_KEY=...
supabase secrets set GOSHO_UPSTREAM_URL=https://centre-mp-eta.vercel.app/api/gosho-du-jour
supabase secrets set ENCOURAGEMENT_UPSTREAM_URL=https://centre-mp-eta.vercel.app/api/encouragement-du-jour

supabase functions deploy ai-chat
supabase functions deploy admin-upsert-profile
supabase functions deploy gosho-du-jour
supabase functions deploy encouragement-du-jour
```

Les routes Vercel `/api/*` restent valides en parallèle.

## 5. Landing content

La table `landing_content` (id = `landing-singleton`) est lisible publiquement ; écriture réservée `admin` / `centre`.

## 6. Checklist sécurité

- [ ] RLS activé (migrations)
- [ ] Aucune clé `service_role` dans le frontend
- [ ] Rôles uniquement via `profiles` / `app_metadata`
- [ ] Signup public désactivé (ou fortement contrôlé)
- [ ] Secrets Groq uniquement serveur (Edge / Vercel)
