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
      subtitle="Questions des visiteurs · réponses naturelles"
      welcome="Bonjour et bienvenue au Centre Miroir Parfait. Je peux vous parler du centre, des activités, de l’agenda ou des contacts. Que souhaitez-vous savoir ?"
      suggestions={SITE_SUGGESTIONS}
      buildContext={buildSiteContext}
      fabOffsetClass="bottom-24 lg:bottom-6"
      accent="blue"
    />
  );
}
