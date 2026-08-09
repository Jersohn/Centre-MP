-- Complète / met à jour actualités + témoignages (3 chacun)
update public.landing_content
set content = content || jsonb_build_object(
  'newsItems', '[
    {
      "id": "formation-saison",
      "title": "Nouvelle saison de formation",
      "summary": "Une nouvelle série de formations sera lancée à partir du mois prochain à Abidjan.",
      "date": "12 août 2026",
      "author": "Direction générale",
      "image": "",
      "category": "Formation",
      "location": "Abidjan, Côte d''Ivoire",
      "content": "Le Centre Miroir Parfait ouvre une nouvelle saison de formation destinée aux responsables et membres des chapitres.\n\nAu programme : approfondissement de l''étude, renforcement des compétences d''accompagnement, et ateliers pratiques pour mieux servir la communauté."
    },
    {
      "id": "campagne-paix-unite",
      "title": "Campagne de paix et d''unité",
      "summary": "Des initiatives communautaires seront renforcées sur tous les chapitres de Côte d''Ivoire.",
      "date": "05 août 2026",
      "author": "Commission culturelle",
      "image": "",
      "category": "Initiative",
      "location": "Côte d''Ivoire",
      "content": "Une campagne de paix et d''unité est lancée pour mobiliser les membres autour d''actions concrètes dans les quartiers, les groupes et les familles."
    },
    {
      "id": "visite-chapitres",
      "title": "Visite des chapitres",
      "summary": "Les responsables centre partagent encouragement et perspective avec les trois chapitres.",
      "date": "28 juillet 2026",
      "author": "Responsable centre",
      "image": "",
      "category": "Vie du centre",
      "location": "Abidjan, Côte d''Ivoire",
      "content": "Une tournée d''encouragement a été organisée auprès des chapitres Rissho Ankoku Ron, Shin Gyo Gaku et Trois Trésors."
    }
  ]'::jsonb,
  'testimonials', '[
    {
      "id": "kouassi",
      "name": "M. Kouassi",
      "role": "Responsable district — Abidjan",
      "quote": "Une plateforme moderne, claire et inspirante pour notre communauté en Côte d''Ivoire.",
      "image": "",
      "chapter": "Rissho Ankoku Ron",
      "location": "Abidjan",
      "memberSince": "2014",
      "fullStory": "Depuis plusieurs années, M. Kouassi accompagne les membres de son district avec conviction.",
      "themes": ["Leadership", "Unité", "Accompagnement des familles"]
    },
    {
      "id": "amani",
      "name": "Mme. Amani",
      "role": "Responsable groupe — Cocody",
      "quote": "L''expérience est à la fois élégante, humaine et profondément alignée avec nos valeurs.",
      "image": "",
      "chapter": "Trois Trésors",
      "location": "Cocody",
      "memberSince": "2018",
      "fullStory": "Mme Amani anime un groupe dynamique à Cocody et salue des outils pratiques pour l''agenda et les actualités.",
      "themes": ["Humanisme", "Communication", "Dynamique de groupe"]
    },
    {
      "id": "yao",
      "name": "M. Yao",
      "role": "Responsable jeunesse — Marcory",
      "quote": "Les jeunes trouvent ici des repères concrets pour avancer avec courage et responsabilité.",
      "image": "",
      "chapter": "Shin Gyo Gaku",
      "location": "Marcory",
      "memberSince": "2019",
      "fullStory": "M. Yao coordonne les activités jeunesse et témoigne de l''élan créé par l''étude et les projets collectifs.",
      "themes": ["Jeunesse", "Courage", "Responsabilité"]
    }
  ]'::jsonb
),
updated_at = now()
where id = 'landing-singleton';
