# Supabase Setup for Centre-MP

## 1. Create a Supabase project

1. Go to https://app.supabase.com and create a new project.
2. In the project settings, copy the `API URL` and `anon public` key.
3. Add these values to your Vercel environment variables as described below.

## 2. Create the `landing_content` table

Use the SQL editor in Supabase and run the following:

```sql
create table public.landing_content (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz default now()
);

insert into public.landing_content (id, content) values (
  'landing-singleton',
  '{
    "heroTitle": "Développer une vie de valeur, bâtir une société de paix.",
    "heroParagraph": "Grâce à la philosophie humaniste du bouddhisme de Nichiren, le Centre Miroir Parfait accompagne les individus et les communautés vers l’harmonie, la sagesse et l’unité.",
    "heroImage": "https://source.unsplash.com/1800x1200/?african,community",
    "aboutText": "Le centre accompagne les individus et les communautés dans leur cheminement vers la sagesse, la responsabilité et la construction d’un monde plus juste.",
    "aboutImage": "https://source.unsplash.com/1200x800/?african,people",
    "galleryItems": [],
    "stats": [],
    "newsItems": [],
    "agendaItems": [],
    "testimonials": [],
    "dailyDirective": { "title": "Directive du jour", "date": "", "text": "", "author": "" },
    "goshoPassage": { "title": "", "excerpt": "", "context": "", "reference": "" },
    "contactEmail": "contact@centremiroirparfait.org",
    "contactPhone": "+221 77 000 00 00",
    "contactAddress": "Dakar, Sénégal"
  }'
);
```

> Note: If you enable Row Level Security (RLS), you must also add policies for public select and upsert access.

## 3. Set environment variables in Vercel

In your Vercel project Settings > Environment Variables, add:

- `VITE_SUPABASE_URL`: your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: your Supabase anon public key

Also keep a local copy in `.env` for development, but do not commit it.

## 4. Vercel deployment

The app already includes `vercel.json` for static deployment.

- Build command: `npm run build`
- Output directory: `dist`

If you connect the repo to Vercel, deploy as a Static Site. The `routes` section in `vercel.json` rewrites all requests to `/index.html`, which supports client-side routing.

## 5. Notes for this project

- The current login page uses Supabase email/password auth when Supabase is configured.
- The landing page syncs content from Supabase into `localStorage` on load.
- The admin editor can save the landing page content back to Supabase when environment variables are provided.
