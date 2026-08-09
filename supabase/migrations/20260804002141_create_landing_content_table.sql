create table if not exists public.landing_content (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

-- Optional seed row for the singleton landing content entry
insert into public.landing_content (id, content)
values (
  'landing-singleton',
  jsonb_build_object(
    'heroTitle', 'Développer une vie de valeur, bâtir une société de paix.',
    'heroParagraph', 'Grâce à la philosophie humaniste du bouddhisme de Nichiren, le Centre Miroir Parfait accompagne les individus et les communautés de Côte d’Ivoire vers l’harmonie, la sagesse et l’unité.',
    'heroImage', '',
    'aboutText', 'Le Centre Miroir Parfait accompagne les individus et les communautés dans leur cheminement vers la sagesse, la responsabilité et la construction d’un monde plus juste.',
    'aboutImage', '',
    'galleryItems', '[]'::jsonb,
    'stats', '[]'::jsonb,
    'newsItems', '[]'::jsonb,
    'agendaItems', '[]'::jsonb,
    'testimonials', '[]'::jsonb,
    'dailyDirective', jsonb_build_object('title', 'Directive du jour', 'date', '', 'text', '', 'author', ''),
    'goshoPassage', jsonb_build_object('title', '', 'excerpt', '', 'context', '', 'reference', ''),
    'contactEmail', 'contact@centremiroirparfait.ci',
    'contactPhone', '+225 07 00 00 00 00',
    'contactAddress', 'Abidjan, Côte d’Ivoire'
  )
)
on conflict (id) do nothing;
