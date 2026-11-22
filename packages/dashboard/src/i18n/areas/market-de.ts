// The Marketplace in German (market.ts).

import type { marketEnglish } from "./market-en.ts";

export const marketGerman: typeof marketEnglish = {
  about: "Was deine Fabrik kann, und mit welchen Diensten sie arbeitet.",
  tabsLabel: "Marktplatz",
  tabs: {
    extensions: "Erweiterungen",
    connections: "Verbindungen",
    kits: "Produkt-Kits",
  },
  search: "Erweiterungen suchen",
  filterLabel: "Filter",
  filters: {
    all: "Alle",
    installed: "Installiert",
    kobble: "Von Kobble",
    team: "Von deinem Team",
  },
  sections: { installed: "Installiert", available: "Verfügbar" },
  noMatch:
    "Keine Erweiterung passt. Versuch andere Wörter, oder bitte Sprocket um eine eigene.",
  open: (name) => `${name} öffnen`,
  madeByTeam: "Von deinem Team gemacht",
  madeByKobble: "Von Kobble gemacht",
  states: {
    installed: "Installiert",
    inUse: "In Gebrauch",
    preinstalled: "Vorinstalliert",
  },
  cancel: "Abbrechen",
  install: "Installieren",
  installTitle: (names) => `${names} installieren?`,
  installText: (name, needs, many) =>
    `${name} braucht ${needs}, ${many ? "die noch nicht installiert sind" : "was noch nicht installiert ist"}. Sie werden zusammen installiert.`,
  installBoth: (names) => `${names} installieren`,
  remove: "Entfernen",
  removeTitle: (name) => `${name} entfernen?`,
  goes: (what) => `Geht weg: ${what}.`,
  stays: (what) => `Bleibt in den Dateien der Fabrik: ${what}.`,
  staysOther: "was sie gemacht hat",
  its: {
    page: "ihre Seite",
    blocks: "ihre Home-Blöcke",
    kobolds: "ihr Kobold",
  },
  neededBy: (names, name, many) =>
    `${names} ${many ? "brauchen" : "braucht"} ${name}. Entferne sie zuerst.`,
  always: "Immer nötig",
  alwaysBecause: (why) => `Immer nötig: ${why}`,
  why: { factory: "sie baut alles" },
  nothingNeedsIt: "Keine installierte Erweiterung braucht sie.",
  noProduct: "Noch kein Produkt.",
  sectionsOf: {
    brings: "Was sie mitbringt",
    needs: "Braucht",
    neededBy: "Gebraucht von",
    usedBy: "Benutzt von",
    settings: "Einstellungen",
  },
  brings: {
    page: (n) => (n === 1 ? "Seite" : "Seiten"),
    blocks: "Home-Blöcke",
    stage: (n) => (n === 1 ? "Stufe" : "Stufen"),
    kobold: (n) => (n === 1 ? "Kobold" : "Kobolde"),
  },
  stages: {
    build: "Fabrik",
    explore: "Erkundungen",
    signals: "Signale",
    done: "Fertig",
    release: "Release",
  },
  blocks: {
    status: "Produktstatus",
    waiting: "Wartet auf dich",
    loop: "Der Kreislauf",
    reviews: "Offene Reviews",
    exploring: "In Erkundung",
    signals: "Neue Signale",
  },
  slots: { code: "Dein Code", tasks: "Deine Aufgaben" },
  kitBrings: {
    rules: "Regeln",
    starter: "Ein Startpunkt",
    checks: "Prüfungen",
    tools: "Werkzeuge für die Kobolde",
  },
  extensions: {
    factory: {
      name: "Fabrik",
      about: "Das Board, auf dem Arbeit gebaut wird, von offen bis fertig.",
    },
    explorations: {
      name: "Erkundungen",
      about: "Erkunde eine Idee mit dem Kobold, bevor etwas gebaut wird.",
    },
    signals: {
      name: "Signale",
      about:
        "Was die laufende App meldet: Fehler, Wünsche und wie sie benutzt wird.",
    },
    personas: {
      name: "Personas",
      about:
        "Erfundene Kundinnen und Kunden, die die App benutzen und dir sagen, was kaputt ist.",
    },
    releases: {
      name: "Releases",
      about: "Zahlen und Notizen zu jedem Release deines Produkts.",
    },
    github: {
      name: "GitHub-Board",
      about: "Arbeit auf einem GitHub-Board, über die GitHub CLI.",
    },
    jira: {
      name: "Jira Cloud",
      about: "Arbeit in einem Jira-Cloud-Projekt, mit einem API-Token.",
    },
  },
  staysIn: {
    explorations: "ihre Erkundungen",
    signals: "ihre Signale",
    personas: "ihre Personas und deren Aufträge",
    releases: "ihre Releases",
  },
  connections: {
    code: {
      title: "Dein Code",
      about: "Branches und Pull Requests.",
      name: "GitHub",
      line: "Dein Code und seine Pull Requests, über die GitHub CLI.",
    },
    tasks: {
      title: "Deine Aufgaben",
      about: "Wo die Karten der Fabrik liegen. Wähle eine.",
    },
    connect: "Verbinden",
    switchTo: (name) => `Zu ${name} wechseln`,
    switchShort: { github: "GitHub", jira: "Jira" },
    switchTitle: (from, to) => `Von ${from} zu ${to} wechseln?`,
    switchText: (to) =>
      `Deine Karten bleiben, wo sie sind. Danach verbindest du ${to}.`,
    switchGo: "Weiter",
  },
  // A page or block a team's own extension describes.
  screen: {
    emptyList: "Hier ist noch nichts.",
    from: (name: string) => `Von ${name}`,
  },
  kits: {
    about:
      "Kobble kommt mit diesen Kits. Jedes bringt den Kobolden eine Art von Produkt bei.",
  },
};
