import "@fontsource-variable/onest";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app";
import { applyChoice, storedChoice } from "@/lib/theme-choice";
import "./index.css";

// Light or dark as chosen in Settings, on the factory's styles and, once it
// has loaded, on the company's theme.
const followChoice = () => {
  applyChoice(
    document.styleSheets,
    storedChoice(() => localStorage),
  );
};

// The company's theme (the server's /theme.css, empty without one), last,
// so its variables win over the factory's own.
const theme = document.createElement("link");
theme.rel = "stylesheet";
theme.href = "/theme.css";
theme.addEventListener("load", followChoice);
document.head.append(theme);
followChoice();

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no element with the id root.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
