import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AppRoutes } from "./routes/AppRoutes.tsx";
import { ThemeProvider } from "./theme/ThemeProvider";
import { purgeMockAccountStorage } from "./app/profilesData";
import "./styles/index.css";

purgeMockAccountStorage();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </ThemeProvider>,
);
  