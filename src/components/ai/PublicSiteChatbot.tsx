import {
  SITE_SUGGESTIONS,
  buildSiteContext,
} from "../../services/aiAssistants";
import { ChatbotWidget } from "./ChatbotWidget";

export function PublicSiteChatbot() {
  return (
    <ChatbotWidget
      mode="site"
      title="Assistant du centre"
      subtitle="Réponses précises à partir des pages du site"
      welcome="Bonjour et bienvenue au Centre Miroir Parfait. Je parcours le contenu du site (accueil, agenda, actualités, lecture du jour, témoignages, contacts…) pour vous répondre précisément. Que souhaitez-vous savoir ?"
      suggestions={SITE_SUGGESTIONS}
      buildContext={(question) => buildSiteContext(question)}
      fabOffsetClass="bottom-24 lg:bottom-6"
      accent="blue"
    />
  );
}
