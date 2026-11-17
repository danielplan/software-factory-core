// The dashboard in the person's language: English, Italian, German, French
// or Spanish, with i18next (https://www.i18next.com), the usual library for
// it. Each part of the dashboard has its words in a file per language
// (locales/<language>/<part>.json), English first; the others say the same.
// The language is the one chosen in Settings, kept in this browser, else the
// browser's own when it is one of these, else English. Outside a browser (the
// tests) it is always English.

import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { languageOf, storedLanguage } from "../lib/language-choice.ts";
import enCommon from "./locales/en/common.json" with { type: "json" };
import enOverview from "./locales/en/overview.json" with { type: "json" };
import enChat from "./locales/en/chat.json" with { type: "json" };
import enUnderstand from "./locales/en/understand.json" with { type: "json" };
import enExplore from "./locales/en/explore.json" with { type: "json" };
import enBuild from "./locales/en/build.json" with { type: "json" };
import enProduct from "./locales/en/product.json" with { type: "json" };
import enSettings from "./locales/en/settings.json" with { type: "json" };
import enSetup from "./locales/en/setup.json" with { type: "json" };
import enChecks from "./locales/en/checks.json" with { type: "json" };
import itCommon from "./locales/it/common.json" with { type: "json" };
import itOverview from "./locales/it/overview.json" with { type: "json" };
import itChat from "./locales/it/chat.json" with { type: "json" };
import itUnderstand from "./locales/it/understand.json" with { type: "json" };
import itExplore from "./locales/it/explore.json" with { type: "json" };
import itBuild from "./locales/it/build.json" with { type: "json" };
import itProduct from "./locales/it/product.json" with { type: "json" };
import itSettings from "./locales/it/settings.json" with { type: "json" };
import itSetup from "./locales/it/setup.json" with { type: "json" };
import itChecks from "./locales/it/checks.json" with { type: "json" };
import deCommon from "./locales/de/common.json" with { type: "json" };
import deOverview from "./locales/de/overview.json" with { type: "json" };
import deChat from "./locales/de/chat.json" with { type: "json" };
import deUnderstand from "./locales/de/understand.json" with { type: "json" };
import deExplore from "./locales/de/explore.json" with { type: "json" };
import deBuild from "./locales/de/build.json" with { type: "json" };
import deProduct from "./locales/de/product.json" with { type: "json" };
import deSettings from "./locales/de/settings.json" with { type: "json" };
import deSetup from "./locales/de/setup.json" with { type: "json" };
import deChecks from "./locales/de/checks.json" with { type: "json" };
import frCommon from "./locales/fr/common.json" with { type: "json" };
import frOverview from "./locales/fr/overview.json" with { type: "json" };
import frChat from "./locales/fr/chat.json" with { type: "json" };
import frUnderstand from "./locales/fr/understand.json" with { type: "json" };
import frExplore from "./locales/fr/explore.json" with { type: "json" };
import frBuild from "./locales/fr/build.json" with { type: "json" };
import frProduct from "./locales/fr/product.json" with { type: "json" };
import frSettings from "./locales/fr/settings.json" with { type: "json" };
import frSetup from "./locales/fr/setup.json" with { type: "json" };
import frChecks from "./locales/fr/checks.json" with { type: "json" };
import esCommon from "./locales/es/common.json" with { type: "json" };
import esOverview from "./locales/es/overview.json" with { type: "json" };
import esChat from "./locales/es/chat.json" with { type: "json" };
import esUnderstand from "./locales/es/understand.json" with { type: "json" };
import esExplore from "./locales/es/explore.json" with { type: "json" };
import esBuild from "./locales/es/build.json" with { type: "json" };
import esProduct from "./locales/es/product.json" with { type: "json" };
import esSettings from "./locales/es/settings.json" with { type: "json" };
import esSetup from "./locales/es/setup.json" with { type: "json" };
import esChecks from "./locales/es/checks.json" with { type: "json" };

export const resources = {
  en: {
    common: enCommon,
    overview: enOverview,
    chat: enChat,
    understand: enUnderstand,
    explore: enExplore,
    build: enBuild,
    product: enProduct,
    settings: enSettings,
    setup: enSetup,
    checks: enChecks,
  },
  it: {
    common: itCommon,
    overview: itOverview,
    chat: itChat,
    understand: itUnderstand,
    explore: itExplore,
    build: itBuild,
    product: itProduct,
    settings: itSettings,
    setup: itSetup,
    checks: itChecks,
  },
  de: {
    common: deCommon,
    overview: deOverview,
    chat: deChat,
    understand: deUnderstand,
    explore: deExplore,
    build: deBuild,
    product: deProduct,
    settings: deSettings,
    setup: deSetup,
    checks: deChecks,
  },
  fr: {
    common: frCommon,
    overview: frOverview,
    chat: frChat,
    understand: frUnderstand,
    explore: frExplore,
    build: frBuild,
    product: frProduct,
    settings: frSettings,
    setup: frSetup,
    checks: frChecks,
  },
  es: {
    common: esCommon,
    overview: esOverview,
    chat: esChat,
    understand: esUnderstand,
    explore: esExplore,
    build: esBuild,
    product: esProduct,
    settings: esSettings,
    setup: esSetup,
    checks: esChecks,
  },
} as const;

export const NAMESPACES = [
  "common",
  "overview",
  "chat",
  "understand",
  "explore",
  "build",
  "product",
  "settings",
  "setup",
  "checks",
] as const;

const inBrowser = typeof window !== "undefined";

void i18next.use(initReactI18next).init({
  resources,
  lng: inBrowser ? languageOf(storedLanguage(), navigator.languages) : "en",
  fallbackLng: "en",
  ns: NAMESPACES,
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export const t = i18next.t.bind(i18next);
export { i18next };
