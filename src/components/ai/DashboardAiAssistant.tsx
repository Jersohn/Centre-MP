import { DASHBOARD_SUGGESTIONS } from "../../services/aiAssistants";
import { buildDashboardContext } from "../../services/dashboardAiContext";
import { ROLE_LABELS, type PlatformRole } from "../../app/roles";
import { ChatbotWidget } from "./ChatbotWidget";

type Props = {
  role: PlatformRole;
};

export function DashboardAiAssistant({ role }: Props) {
  return (
    <ChatbotWidget
      mode="dashboard"
      title="Assistant pilotage"
      subtitle={`${ROLE_LABELS[role]} · réponses précises sur votre périmètre`}
      welcome={`Bonjour. Je suis votre assistant de pilotage (${ROLE_LABELS[role]}). Je m’appuie sur les indicateurs, membres et collectes de votre périmètre pour répondre précisément. Que souhaitez-vous savoir ?`}
      suggestions={DASHBOARD_SUGGESTIONS}
      buildContext={(question) => buildDashboardContext(role, question)}
      fabOffsetClass="bottom-6"
      accent="gold"
    />
  );
}
