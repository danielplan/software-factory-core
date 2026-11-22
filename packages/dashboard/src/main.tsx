import "@fontsource-variable/inter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/app";
import { chosenLocale } from "@/i18n/locale";
import { i18n } from "@/i18n/messages";
import { LanguageProvider } from "@/i18n/use-t";
import { followLogo, THEME_LOADED } from "@/lib/brand";
import { lightOnly } from "@/lib/light-only";
import "./index.css";

// A page left open while the dashboard was built again asks for code files
// that are gone (their names change with each build): it loads itself
// again, once, so it runs the new build instead of showing a blank part.
// Not again within a minute, so a real failure cannot loop.
const RELOADED = "kobble:reloaded-for-new-build";
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem(RELOADED) ?? 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(RELOADED, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

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

// The browser's language until the owner's choice is read.
void i18n.changeLanguage(chosenLocale("browser", navigator.languages));

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no element with the id root.");

createRoot(root).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
