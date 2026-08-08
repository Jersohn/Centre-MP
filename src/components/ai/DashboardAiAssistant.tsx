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
      subtitle={`${ROLE_LABELS[role]} · points clés rapides`}
      welcome={`Bonjour. Je suis votre assistant de pilotage (${ROLE_LABELS[role]}). Demandez-moi un résumé d’indicateurs, un point Vague de Paix / Zaimu, ou les alertes de votre périmètre.`}
      suggestions={DASHBOARD_SUGGESTIONS}
      buildContext={() => buildDashboardContext(role)}
      fabOffsetClass="bottom-6"
      accent="gold"
    />
  );
}
