import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerKioskWorker } from "./lib/kioskServiceWorker";

const root = document.getElementById("root");
if (root) createRoot(root).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);

void registerKioskWorker().catch(() => { /* kiosk stays usable without worker support */ });
