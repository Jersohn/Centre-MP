create table if not exists public.landing_content (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

-- Optional seed row for the singleton landing content entry
insert into public.landing_content (id, content)
values (
  'landing-singleton',
  jsonb '{
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
  }'::jsonb
)
on conflict (id) do nothing;
