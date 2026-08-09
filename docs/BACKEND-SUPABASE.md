# Backend Supabase — Centre Miroir Parfait

Architecture sécurisée pour remplacer les seeds / localStorage du dashboard.

## Principes de sécurité

1. **RLS partout** sur `public.*` et buckets Storage.
2. **Rôles dans `public.profiles`**, jamais dans `user_metadata` (éditable par le client).
3. Sync JWT via **`app_metadata`** (trigger) — les policies lisent surtout la table `profiles`.
4. Fonctions privilégiées dans **`app_private`** (`security definer`), non exposées à `anon` / `authenticated` sauf grants explicites.
5. **`service_role` uniquement côté Edge Functions** — jamais dans le frontend Vite.
6. Périmètre org : `app_private.can_access_org(chapitre, district, groupe)`.

## Schéma

| Table | Rôle |
|-------|------|
| `chapitres` / `districts` / `groupes` | Hiérarchie 3 × 9 × 20 |
| `profiles` | Compte responsable (1:1 `auth.users`) + rôle + scope |
| `members` | Fiches membres |
| `collectes` | Vague de Paix / Zaimu ordinaire / Zaimu spécial |
| `zaimu_campaigns` + `zaimu_quota_assignments` | Cotas multi-niveaux |
| `landing_content` | Contenu site (JSONB) |

Vues : `v_org_tree`, `v_collectes_enriched` (`security_invoker = true`).

## Migrations

Ordre dans `supabase/migrations/` :

1. `20260804002141_create_landing_content_table.sql` (historique)
2. `20260809153000_secure_backend_foundation.sql`
3. `20260809153100_rls_security_helpers.sql`
4. `20260809153200_seed_org_and_campaign.sql`
5. `20260809153300_storage_views_triggers.sql`

## Edge Functions

| Fonction | Auth | Secret |
|----------|------|--------|
| `ai-chat` | optionnel | `GROQ_API_KEY` |
| `gosho-du-jour` | public GET | `GOSHO_UPSTREAM_URL` |
| `encouragement-du-jour` | public GET | `ENCOURAGEMENT_UPSTREAM_URL` |
| `admin-upsert-profile` | JWT admin / centre | service role auto |
| `admin-invite-user` | JWT admin / centre | service role auto |

Les scrapers lourds restent sur Vercel `/api/*` ; les fonctions Supabase peuvent les proxifier.

## Invitations & RBAC

1. **Admin / centre / chapitre** peuvent ajouter des responsables (Paramètres → Utilisateurs).
2. Chapitre : uniquement rôles `district` et `groupe` dans son chapitre.
3. `admin-invite-user` crée le compte Auth avec `email_confirm: true` + mot de passe temporaire, profil **actif** (pas de confirmation e-mail).
4. Promotion d’un membre : action **Promouvoir responsable** (même edge function) ou changement de rôle dans la table utilisateurs (`admin-upsert-profile`).
5. Matrice RBAC : `role_module_access` ; préférences : `app_settings`.

## Projet

- URL : `https://bolxvzsegdxtszihwlqh.supabase.co`
- Ref : `bolxvzsegdxtszihwlqh`

Frontend (`.env` / Vercel) :

```env
VITE_SUPABASE_URL=https://bolxvzsegdxtszihwlqh.supabase.co
VITE_SUPABASE_ANON_KEY=<Dashboard → Settings → API → anon public>
```

## Déploiement

```bash
npx supabase login
npx supabase link --project-ref bolxvzsegdxtszihwlqh
npx supabase db push
npx supabase secrets set GROQ_API_KEY=... GOSHO_UPSTREAM_URL=https://centre-mp-eta.vercel.app/api/gosho-du-jour ENCOURAGEMENT_UPSTREAM_URL=https://centre-mp-eta.vercel.app/api/encouragement-du-jour
npx supabase functions deploy ai-chat gosho-du-jour encouragement-du-jour admin-upsert-profile admin-invite-user --use-api
```

## Premier administrateur

1. Créer un utilisateur Auth (Dashboard → Authentication).
2. Appeler `admin-upsert-profile` **une fois** avec le service role (SQL Editor) :

```sql
update public.profiles
set role = 'admin', status = 'actif', full_name = 'Admin Centre'
where email = 'admin@example.com';
```

## Prochaines étapes frontend

- Remplacer `MEMBERS_SEED` / `COLLECTES_SEED` par requêtes Supabase filtrées RLS.
- Persister la matrice RBAC UI vers `role_module_access` quand Supabase est branché.
