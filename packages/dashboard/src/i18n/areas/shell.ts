// The frame around every page: the pages' names, the sidebar, the lights,
// the kobolds and what they do, and the line while the factory is closed.

import { area } from "../define.ts";

const en = {
  nav: { overview: "Overview", factory: "The factory", pages: "Pages" },
  pages: {
    home: "Home",
    system: "System",
    signals: "Signals",
    explore: "Explorations",
    build: "Factory",
    releases: "Releases",
    personas: "Personas",
    extensions: "Marketplace",
    settings: "Settings",
    team: "Your team",
  },
  groups: { work: "Work", customers: "Customers", team: "Your team" },
  openMenu: "Open the menu",
  menu: "Pages",
  open: "Open",
  lights: {
    running: "Running",
    stopped: "Stopped",
    starting: "Starting",
    problem: "Problem",
  },
  overall: {
    problem: "Something needs you",
    starting: "Starting",
    running: "All running",
    some: (running: number, shown: number) =>
      `${String(running)} of ${String(shown)} running`,
  },
  kobold: {
    building: "Kobold is building",
    busy: (what: string) => `Kobold is ${what}`,
    thinking: "Kobold is thinking",
    resting: "Kobold is resting",
    quiet: (light: string) => `All quiet · ${light}`,
    idle: "Idle",
    answering: "Answering a question",
    buildingCard: (number: number, title: string) =>
      `Building #${String(number)} · ${title}`,
    working: (name: string, now: string) => `${name} is working: ${now}`,
  },
  jobs: {
    support: "Answers your questions, on every page",
    explorer: "Thinks explorations through and makes prototypes",
    builder: "Builds the agreed cards on the Factory board",
    tester: "Uses the app as one of your personas",
    sorter: "Sorts the signals that come in",
  },
  closed:
    "The factory's window seems closed. Start it again with software-factory.",
  opening: "Opening the factory…",
  misfit: "Something in the factory's files does not fit",
};

export const shell = area(
  en,
  {
    nav: { overview: "Panoramica", factory: "La fabbrica", pages: "Pagine" },
    pages: {
      home: "Home",
      system: "Sistema",
      signals: "Segnali",
      explore: "Esplorazioni",
      build: "Fabbrica",
      releases: "Release",
      personas: "Personas",
      extensions: "Marketplace",
      settings: "Impostazioni",
      team: "Il tuo team",
    },
    groups: { work: "Lavoro", customers: "Clienti", team: "Il tuo team" },
    openMenu: "Apri il menu",
    menu: "Pagine",
    open: "Apri",
    lights: {
      running: "In funzione",
      stopped: "Fermo",
      starting: "In avvio",
      problem: "Problema",
    },
    overall: {
      problem: "Qualcosa ha bisogno di te",
      starting: "In avvio",
      running: "Tutto in funzione",
      some: (running, shown) =>
        `${String(running)} di ${String(shown)} in funzione`,
    },
    kobold: {
      building: "Il kobold sta costruendo",
      busy: (what) => `Il kobold: ${what}`,
      thinking: "Il kobold sta pensando",
      resting: "Il kobold riposa",
      quiet: (light) => `Tutto tranquillo · ${light}`,
      idle: "Libero",
      answering: "Risponde a una domanda",
      buildingCard: (number, title) =>
        `Costruisce #${String(number)} · ${title}`,
      working: (name, now) => `${name} sta lavorando: ${now}`,
    },
    jobs: {
      support: "Risponde alle tue domande, su ogni pagina",
      explorer: "Ragiona sulle esplorazioni e crea prototipi",
      builder: "Costruisce le schede concordate sulla bacheca della Fabbrica",
      tester: "Usa l'app come una delle tue personas",
      sorter: "Smista i segnali in arrivo",
    },
    closed:
      "La finestra della fabbrica sembra chiusa. Riavviala con software-factory.",
    opening: "Apro la fabbrica…",
    misfit: "Qualcosa nei file della fabbrica non torna",
  },
  {
    nav: { overview: "Überblick", factory: "Die Fabrik", pages: "Seiten" },
    pages: {
      home: "Start",
      system: "System",
      signals: "Signale",
      explore: "Erkundungen",
      build: "Fabrik",
      releases: "Releases",
      personas: "Personas",
      extensions: "Marktplatz",
      settings: "Einstellungen",
      team: "Dein Team",
    },
    groups: { work: "Arbeit", customers: "Kunden", team: "Dein Team" },
    openMenu: "Menü öffnen",
    menu: "Seiten",
    open: "Öffnen",
    lights: {
      running: "Läuft",
      stopped: "Gestoppt",
      starting: "Startet",
      problem: "Problem",
    },
    overall: {
      problem: "Etwas braucht dich",
      starting: "Startet",
      running: "Alles läuft",
      some: (running, shown) =>
        `${String(running)} von ${String(shown)} laufen`,
    },
    kobold: {
      building: "Der Kobold baut",
      busy: (what) => `Der Kobold: ${what}`,
      thinking: "Der Kobold denkt nach",
      resting: "Der Kobold ruht",
      quiet: (light) => `Alles ruhig · ${light}`,
      idle: "Frei",
      answering: "Beantwortet eine Frage",
      buildingCard: (number, title) => `Baut #${String(number)} · ${title}`,
      working: (name, now) => `${name} arbeitet: ${now}`,
    },
    jobs: {
      support: "Beantwortet deine Fragen, auf jeder Seite",
      explorer: "Denkt Erkundungen durch und baut Prototypen",
      builder: "Baut die vereinbarten Karten auf dem Board der Fabrik",
      tester: "Nutzt die App als eine deiner Personas",
      sorter: "Sortiert die eingehenden Signale",
    },
    closed:
      "Das Fenster der Fabrik scheint geschlossen. Starte sie neu mit software-factory.",
    opening: "Die Fabrik öffnet sich…",
    misfit: "Etwas in den Dateien der Fabrik passt nicht",
  },
);
