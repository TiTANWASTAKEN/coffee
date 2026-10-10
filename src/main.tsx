import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource-variable/playfair/opsz.css";
import "@fontsource-variable/playfair/opsz-italic.css";
import "@fontsource-variable/instrument-sans";
import "@/styles/index.css";
import App from "./App";

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
