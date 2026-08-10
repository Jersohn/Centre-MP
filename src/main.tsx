import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AppRoutes } from "./routes/AppRoutes.tsx";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ConfirmProvider } from "./app/ConfirmDialog";
import { purgeMockAccountStorage } from "./app/profilesData";
import "./styles/index.css";

purgeMockAccountStorage();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <ConfirmProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ConfirmProvider>
  </ThemeProvider>,
);
  