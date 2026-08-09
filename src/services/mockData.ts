import { landingImages } from "../assets/landing/images";

/** Comité du Centre Miroir Parfait */
export const centreCommittee = [
  {
    id: "responsable-centre",
    name: "M. Konan",
    role: "Responsable centre",
    image: landingImages.leaders.centre,
  },
  {
    id: "responsable-homme-centre",
    name: "M. Touré",
    role: "Responsable homme centre",
    image: landingImages.leaders.homme,
  },
  {
    id: "responsable-femme-centre",
    name: "Mme. Bamba",
    role: "Responsable femme centre",
    image: landingImages.leaders.femme,
  },
  {
    id: "responsable-jeunesse-centre",
    name: "M. Coulibaly",
    role: "Responsable jeunesse centre",
    image: landingImages.leaders.jeunesse,
  },
  {
    id: "responsable-jeune-homme-centre",
    name: "M. Yao",
    role: "Responsable jeune homme centre",
    image: landingImages.leaders.jeuneHomme,
  },
  {
    id: "responsable-jeune-fille-centre",
    name: "Mme. N’Guessan",
    role: "Responsable jeune fille centre",
    image: landingImages.leaders.jeuneFille,
  },
];

/** Responsables de chapitres + statistiques */
export const chapterLeaders = [
  {
    id: "rissho-ankoku-ron",
    name: "Rissho Ankoku Ron",
    description: "Chapitre engagé dans l’étude et la pratique pour la paix dans le pays et dans la vie.",
    responsibleName: "M. Kouassi",
    responsibleRole: "Responsable chapitre",
    responsibleImage: landingImages.leaders.chapitre1,
    stats: [
      { label: "Districts", value: 3, suffix: "" },
      { label: "Groupes", value: 7, suffix: "" },
      { label: "Membres", value: 60, suffix: "" },
    ],
  },
  {
    id: "shin-gyo-gaku",
    name: "Shin Gyo Gaku",
    description: "Chapitre dédié à la foi, à la pratique et à l’étude au quotidien.",
    responsibleName: "Mme. Amani",
    responsibleRole: "Responsable chapitre",
    responsibleImage: landingImages.leaders.chapitre2,
    stats: [
      { label: "Districts", value: 3, suffix: "" },
      { label: "Groupes", value: 7, suffix: "" },
      { label: "Membres", value: 55, suffix: "" },
    ],
  },
  {
    id: "trois-tresors",
    name: "Trois Trésors",
    description: "Chapitre uni autour du Bouddha, du Dharma et de la Sangha.",
    responsibleName: "M. Diallo",
    responsibleRole: "Responsable chapitre",
    responsibleImage: landingImages.leaders.chapitre3,
    stats: [
      { label: "Districts", value: 3, suffix: "" },
      { label: "Groupes", value: 6, suffix: "" },
      { label: "Membres", value: 58, suffix: "" },
    ],
  },
];

export const galleryItems = [
  {
    id: "activite-shakubuku",
    title: "Activité shakubuku",
    description: "Dialogue sincère pour partager la foi et encourager autour de soi.",
    image: landingImages.gallery.shakubuku,
    date: "10 août 2026",
    location: "Quartiers — Abidjan",
    chapter: "Centre Miroir Parfait",
    category: "Shakubuku",
    content:
      "L’activité shakubuku a permis aux membres d’aller à la rencontre des familles et des amis pour partager, avec bienveillance, l’enseignement du bouddhisme de Nichiren.\n\nÀ travers des dialogues sincères, chacun a pu transmettre courage, espoir et détermination, tout en renforçant les liens de confiance dans le quartier.",
    highlights: ["Dialogue sincère", "Encouragement mutuel", "Propagation de la paix"],
  },
  {
    id: "reunion-discussion-groupe",
    title: "Réunion de discussion",
    description: "Échanges fraternels au sein d’un groupe pour approfondir la pratique.",
    image: landingImages.gallery.meeting,
    date: "02 août 2026",
    location: "Groupe local — Centre Miroir Parfait",
    chapter: "Shin Gyo Gaku",
    category: "Étude & dialogue",
    content:
      "La réunion de discussion a rassemblé les membres d’un groupe autour de l’étude, du partage d’expériences et de l’accompagnement mutuel.\n\nChacun a pu exprimer ses défis et ses victoires, et le groupe a renforcé son unité pour avancer ensemble dans la foi, la pratique et l’étude.",
    highlights: ["Partage d’expériences", "Unité du groupe", "Étude et encouragement"],
  },
  {
    id: "daimoku-butsudan",
    title: "Récitation du daimoku",
    description: "Des membres unis en prière devant le butsudan fermé.",
    image: landingImages.gallery.daimoku,
    date: "28 juillet 2026",
    location: "Salle de prière — Centre Miroir Parfait",
    chapter: "Les 3 chapitres",
    category: "Pratique",
    content:
      "Les membres se sont réunis pour réciter le daimoku devant le butsudan fermé, dans un esprit de gratitude et de détermination.\n\nCe moment de prière collective a fortifié la foi de chacun et renouvelé l’engagement pour la paix, la santé des familles et l’harmonie du centre.",
    highlights: ["Daimoku collectif", "Butsudan fermé", "Détermination partagée"],
  },
  {
    id: "activite-chapitre",
    title: "Activité chapitre",
    description: "Grande rencontre du chapitre pour l’unité, l’étude et le service.",
    image: landingImages.gallery.chapter,
    date: "20 juillet 2026",
    location: "Salle principale — Centre Miroir Parfait",
    chapter: "Rissho Ankoku Ron",
    category: "Activité chapitre",
    content:
      "L’activité chapitre a rassemblé responsables et membres pour un temps d’étude, de partage et d’organisation.\n\nAu programme : encouragements, bilan des actions du mois et préparation des prochaines initiatives au service de la communauté.",
    highlights: ["Unité du chapitre", "Étude et orientation", "Service communautaire"],
  },
  {
    id: "activite-jeunesse-rissho",
    title: "Activité jeunesse — Rissho Ankoku Ron",
    description: "La jeunesse du chapitre unie dans la joie, la solidarité et l’engagement.",
    image: landingImages.gallery.jeunesseRissho,
    date: "9 août 2026",
    location: "Chapitre Rissho Ankoku Ron — Abidjan",
    chapter: "Rissho Ankoku Ron",
    category: "Jeunesse",
    content:
      "Les jeunes du chapitre Rissho Ankoku Ron se sont réunis pour une activité jeunesse marquée par l’unité, l’encouragement mutuel et la détermination partagée.\n\nPoings levés et sourires, ce moment a rappelé la force de la jeunesse du Centre Miroir Parfait pour bâtir la paix dans la société.",
    highlights: ["Jeunesse du chapitre", "Solidarité", "Engagement pour la paix"],
  },
];

export const newsItems = [
  {
    id: "formation-saison",
    title: "Nouvelle saison de formation",
    summary: "Une nouvelle série de formations sera lancée à partir du mois prochain à Abidjan.",
    date: "12 août 2026",
    author: "Direction générale",
    image: landingImages.news.training,
    category: "Formation",
    location: "Abidjan, Côte d’Ivoire",
    content:
      "Le Centre Miroir Parfait ouvre une nouvelle saison de formation destinée aux responsables et membres des chapitres.\n\nAu programme : approfondissement de l’étude, renforcement des compétences d’accompagnement, et ateliers pratiques pour mieux servir la communauté.\n\nLes sessions se tiendront progressivement à Abidjan, avec un accent particulier sur la transmission, l’unité et l’action concrète au service du bien commun.\n\nChaque participant est invité à s’inscrire auprès de son responsable de chapitre et à préparer une question d’étude liée à son défi actuel.",
  },
  {
    id: "campagne-paix-unite",
    title: "Campagne de paix et d’unité",
    summary: "Des initiatives communautaires seront renforcées sur tous les chapitres de Côte d’Ivoire.",
    date: "05 août 2026",
    author: "Commission culturelle",
    image: landingImages.news.community,
    category: "Initiative",
    location: "Côte d’Ivoire",
    content:
      "Une campagne de paix et d’unité est lancée pour mobiliser les membres autour d’actions concrètes dans les quartiers, les groupes et les familles.\n\nDialogues, moments culturels, encouragements mutuels et initiatives solidaires seront mis en avant afin de renforcer les liens entre les chapitres.\n\nCette campagne invite chacun à contribuer, à sa mesure, à une culture de respect, d’écoute et de responsabilité partagée.\n\nLes responsables locaux accompagneront le déploiement des activités et partageront régulièrement les avancées auprès de la communauté.",
  },
  {
    id: "visite-chapitres",
    title: "Visite des chapitres",
    summary: "Les responsables centre partagent encouragement et perspective avec les trois chapitres.",
    date: "28 juillet 2026",
    author: "Responsable centre",
    image: landingImages.news.training,
    category: "Vie du centre",
    location: "Abidjan, Côte d’Ivoire",
    content:
      "Une tournée d’encouragement a été organisée auprès des chapitres Rissho Ankoku Ron, Shin Gyo Gaku et Trois Trésors.\n\nCes rencontres ont permis de renforcer l’unité, d’écouter les défis locaux et de confirmer les priorités du mois : étude, dialogue et accompagnement des familles.",
  },
];

export const agendaItems = [
  {
    id: "assemblee-generale",
    title: "Assemblée générale",
    date: "14 août 2026",
    time: "09:30",
    location: "Centre Miroir Parfait — Abidjan",
    responsible: "Secrétariat général",
    description: "Assemblée générale du centre pour faire le point sur les activités et les perspectives.",
    content:
      "L’assemblée générale réunira les responsables et membres du Centre Miroir Parfait.\n\nAu programme : bilan des activités, partage des priorités du mois, et échanges sur le renforcement de l’unité dans les chapitres.\n\nMerci d’arriver quelques minutes en avance pour faciliter l’accueil et l’organisation.",
  },
  {
    id: "conference-paix",
    title: "Conférence de paix",
    date: "21 août 2026",
    time: "15:00",
    location: "Salle principale",
    responsible: "Direction culturelle",
    description: "Conférence ouverte sur la culture de paix et le dialogue.",
    content:
      "Cette conférence propose un temps d’étude et de réflexion autour de la paix, de la dignité de la vie et de l’engagement citoyen.\n\nLe moment sera suivi d’échanges avec les participants afin de relier les enseignements à la vie quotidienne.\n\nOuvert aux membres et aux amis du centre.",
  },
  {
    id: "etude-gosho",
    title: "Étude du Gosho",
    date: "28 août 2026",
    time: "18:00",
    location: "Groupe jeunesse",
    responsible: "Responsable étude",
    description: "Séance d’étude pour approfondir un passage du Gosho.",
    content:
      "Cette séance d’étude permettra de lire ensemble un passage du Gosho, d’en dégager le sens et de l’appliquer concrètement.\n\nChacun est invité à préparer une question liée à son défi actuel.\n\nPrévoir un carnet de notes et un esprit de partage.",
  },
  {
    id: "dialogue-quartier",
    title: "Dialogue de quartier",
    date: "04 septembre 2026",
    time: "17:00",
    location: "Cocody",
    responsible: "Responsable district",
    description: "Temps de dialogue pour renforcer les liens avec les familles du quartier.",
    content:
      "Un dialogue de quartier est organisé pour encourager les membres et ouvrir des échanges sincères avec les familles.\n\nL’objectif est de renforcer la confiance, l’écoute et l’entraide au sein de la communauté locale.",
  },
  {
    id: "atelier-responsables",
    title: "Atelier des responsables",
    date: "11 septembre 2026",
    time: "10:00",
    location: "Centre Miroir Parfait — Abidjan",
    responsible: "Direction générale",
    description: "Atelier pratique destiné aux responsables de groupes et de districts.",
    content:
      "Cet atelier vise à renforcer les compétences d’accompagnement, de coordination et de communication des responsables.\n\nDes cas concrets et des outils simples seront partagés pour faciliter le suivi des activités.",
  },
  {
    id: "fete-unite",
    title: "Fête de l’unité",
    date: "18 septembre 2026",
    time: "14:00",
    location: "Espace culturel du centre",
    responsible: "Commission culturelle",
    description: "Moment festif pour célébrer l’unité des chapitres.",
    content:
      "La fête de l’unité rassemblera les membres autour de chants, de témoignages et d’expressions culturelles.\n\nVenez avec votre famille et vos amis pour partager un après-midi de joie, de fraternité et d’inspiration.",
  },
];

export const testimonials = [
  {
    id: "kouassi",
    name: "M. Kouassi",
    role: "Responsable district — Abidjan",
    quote: "Une plateforme moderne, claire et inspirante pour notre communauté en Côte d’Ivoire.",
    image: landingImages.testimonials.man,
    chapter: "Rissho Ankoku Ron",
    location: "Abidjan",
    memberSince: "2014",
    fullStory:
      "Depuis plusieurs années, M. Kouassi accompagne les membres de son district avec conviction. Grâce à la pratique et à l’étude, il a pu renforcer l’unité de son équipe et soutenir de nombreuses familles dans leurs défis quotidiens. Il témoigne aujourd’hui de la clarté et de la modernité de l’espace numérique du Centre Miroir Parfait, qui facilite le suivi des activités et la communication entre responsables.",
    themes: ["Leadership", "Unité", "Accompagnement des familles"],
  },
  {
    id: "amani",
    name: "Mme. Amani",
    role: "Responsable groupe — Cocody",
    quote: "L’expérience est à la fois élégante, humaine et profondément alignée avec nos valeurs.",
    image: landingImages.testimonials.woman,
    chapter: "Trois Trésors",
    location: "Cocody",
    memberSince: "2018",
    fullStory:
      "Mme Amani anime un groupe dynamique à Cocody. Elle salue une expérience numérique qui respecte l’esprit humaniste de la Soka Gakkai tout en offrant des outils pratiques pour l’agenda, les actualités et le partage des moments de vie. Pour elle, chaque membre doit pouvoir se sentir informé, soutenu et inspiré, où qu’il se trouve.",
    themes: ["Humanisme", "Communication", "Dynamique de groupe"],
  },
  {
    id: "yao",
    name: "M. Yao",
    role: "Responsable jeunesse — Marcory",
    quote: "Les jeunes trouvent ici des repères concrets pour avancer avec courage et responsabilité.",
    image: landingImages.testimonials.man,
    chapter: "Shin Gyo Gaku",
    location: "Marcory",
    memberSince: "2019",
    fullStory:
      "M. Yao coordonne les activités jeunesse. Il témoigne de l’élan créé par les moments d’étude, les dialogues et les projets collectifs qui aident chacun à développer sa propre révolution humaine.",
    themes: ["Jeunesse", "Courage", "Responsabilité"],
  },
];

export const dailyDirective = {
  title: "Encouragement du jour",
  date: "08 août 2026",
  text: "Cultivons la paix intérieure, l’harmonie dans le groupe et la bonté dans nos actes.",
  author: "Daisaku Ikeda",
  image: landingImages.news.community,
  fullText:
    "Cultivons la paix intérieure, l’harmonie dans le groupe et la bonté dans nos actes. Chaque journée est une occasion de transformer notre vie et d’apporter encouragement à ceux qui nous entourent.\n\nDans nos familles, nos groupes et nos quartiers, avançons avec un cœur large. La victoire commence par un dialogue sincère, une prière déterminée et des actions concrètes au service du bonheur des autres.\n\nQue chaque membre du Centre Miroir Parfait renouvelle aujourd’hui sa détermination à vivre avec courage, sagesse et compassion.",
  reflection:
    "Quelle action concrète puis-je accomplir aujourd’hui pour renforcer l’unité de mon groupe ?",
  source: "Publié par le Centre Miroir Parfait — SGI Côte d’Ivoire",
};

export const goshoPassage = {
  title: "Passage du Gosho",
  goshoTitle: "Sur l’atteinte de la bouddhéité en cette vie",
  excerpt: "Le chemin de la vérité se révèle à ceux qui s’unissent dans la conviction et la pratique constante.",
  context: "Passage mis en valeur pour l’étude et la réflexion quotidienne au Centre Miroir Parfait.",
  reference: "Écrits de Nichiren Daishonin",
  fullText:
    "Le chemin de la vérité se révèle à ceux qui s’unissent dans la conviction et la pratique constante. Lorsque nous élevons notre vie par la foi, la pratique et l’étude, nous pouvons transformer les obstacles en occasion de croissance.\n\nL’étude du Gosho n’est pas seulement une lecture : c’est un miroir pour notre vie quotidienne. Elle nous rappelle que chaque personne possède la bouddhéité, et que l’unité dans la diversité est une source de force immense.\n\nAujourd’hui, lisons ce passage avec le cœur, partageons-en le sens dans nos groupes, et appliquons-le concrètement dans nos relations et nos responsabilités.",
  reflection:
    "Comment ce passage m’encourage-t-il dans mon défi actuel ?",
  source: "Sélection d’étude — Centre Miroir Parfait",
};

export const thoughtOfDay =
  "Aujourd’hui, avançons avec un cœur déterminé : chaque prière sincère, chaque dialogue bienveillant et chaque action pour le bonheur d’autrui illuminent notre vie et celle de notre communauté.";
