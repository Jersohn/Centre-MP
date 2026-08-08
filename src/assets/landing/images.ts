import heroCommunaute from "./hero-communaute-ci.jpg";
import heroCulture from "./hero-culture-joie-ci.jpg";
import heroJeunesse from "./hero-jeunesse-espoir-ci.jpg";
import heroPriere from "./hero-priere-butsudan-ci.png";
import aboutPriere from "./about-priere-butsudan-ci.png";
import galerieShakubuku from "./galerie-shakubuku-ci.png";
import galerieReunionGroupe from "./galerie-reunion-groupe-ci.png";
import galerieDaimoku from "./galerie-daimoku-butsudan-ci.png";
import galerieActiviteChapitre from "./galerie-activite-chapitre-ci.png";
import newsFormation from "./news-formation-ci.jpg";
import newsCommunaute from "./news-communaute-ci.jpg";
import temoinHomme from "./temoin-homme-ci.jpg";
import temoinFemme from "./temoin-femme-ci.jpg";
import respCentre from "./resp-centre.jpg";
import respHomme from "./resp-homme.jpg";
import respFemme from "./resp-femme.jpg";
import respJeunesse from "./resp-jeunesse.jpg";
import respJeuneHomme from "./resp-jeune-homme.jpg";
import respJeuneFille from "./resp-jeune-fille.jpg";
import respChapitre1 from "./resp-chapitre-1.jpg";
import respChapitre2 from "./resp-chapitre-2.jpg";
import respChapitre3 from "./resp-chapitre-3.jpg";

/** Illustrations locales — communauté ivoirienne / ouest-africaine */
export const landingImages = {
  hero: heroCommunaute,
  heroSlides: [
    {
      src: heroCommunaute,
      alt: "Famille et communauté du Centre Miroir Parfait en Côte d’Ivoire",
    },
    {
      src: heroPriere,
      alt: "Le responsable dirige la prière devant le butsudan fermé, les membres assis derrière",
    },
    {
      src: heroCulture,
      alt: "Joie, culture et célébration partagée au sein de la communauté",
    },
    {
      src: heroJeunesse,
      alt: "Jeunesse et espoir — l’avenir de la communauté en Côte d’Ivoire",
    },
  ],
  about: aboutPriere,
  leaders: {
    centre: respCentre,
    homme: respHomme,
    femme: respFemme,
    jeunesse: respJeunesse,
    jeuneHomme: respJeuneHomme,
    jeuneFille: respJeuneFille,
    chapitre1: respChapitre1,
    chapitre2: respChapitre2,
    chapitre3: respChapitre3,
  },
  gallery: {
    shakubuku: galerieShakubuku,
    meeting: galerieReunionGroupe,
    daimoku: galerieDaimoku,
    chapter: galerieActiviteChapitre,
  },
  news: {
    training: newsFormation,
    community: newsCommunaute,
  },
  testimonials: {
    man: temoinHomme,
    woman: temoinFemme,
  },
} as const;
