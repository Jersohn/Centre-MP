-- Corrige les textes UTF-8 corrompus du seed historique landing_content
update public.landing_content
set content = content || jsonb_build_object(
  'heroTitle', 'Développer une vie de valeur, bâtir une société de paix.',
  'heroParagraph', 'Grâce à la philosophie humaniste du bouddhisme de Nichiren, le Centre Miroir Parfait accompagne les individus et les communautés de Côte d’Ivoire vers l’harmonie, la sagesse et l’unité.',
  'aboutText', 'Le Centre Miroir Parfait appartient à la Région générale Terre de Victoire, à la Région Myoren et au Centre général Osaka. Il regroupe trois chapitres — Rissho Ankoku Ron, Shin Gyo Gaku et Trois Trésors — et accompagne les membres vers la sagesse, la responsabilité et la construction d’un monde plus juste.',
  'contactEmail', 'contact@centremiroirparfait.ci',
  'contactPhone', '+225 07 00 00 00 00',
  'contactAddress', 'Abidjan, Côte d’Ivoire'
),
updated_at = now()
where id = 'landing-singleton';
