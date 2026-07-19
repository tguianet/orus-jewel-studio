import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { applyPwaManifestForPath } from "./pwa/applyManifest";
import { registerPwa } from "./pwa/registerPwa";

// Aplica o manifesto correto o quanto antes (antes do React), para o prompt de instalação.
applyPwaManifestForPath(window.location.pathname);

createRoot(document.getElementById("root")!).render(<App />);
registerPwa();
