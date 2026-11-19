import "@fontsource-variable/inter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app";
import { followLogo, THEME_LOADED } from "@/lib/brand";
import { lightOnly } from "@/lib/light-only";
import "./index.css";

// Light only, also for the company's theme once it has loaded; its logo
// as the tab's icon.
const followChoice = () => {
  lightOnly(document.styleSheets);
};

// The company's theme (the server's /theme.css, empty without one), last,
// so its variables win over the factory's own.
const theme = document.createElement("link");
theme.rel = "stylesheet";
theme.href = "/theme.css";
theme.addEventListener("load", () => {
  followChoice();
  followLogo();
  window.dispatchEvent(new Event(THEME_LOADED));
});
document.head.append(theme);
followChoice();

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no element with the id root.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
