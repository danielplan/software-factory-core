// Settings: its sections, the language, the live app, saving a group.

import { area } from "../define.ts";

const en = {
  about:
    "How the factory works here: where work is tracked, updates, add-ons, and the settings of its parts.",
  sectionsLabel: "Sections",
  sections: {
    language: "Language",
    tracker: "Where work is tracked",
    liveApp: "The live app",
    updates: "Updates",
    addOns: "Add-ons",
    programs: "The factory's programs",
    computer: "This computer",
  },
  language: {
    about: "The language Kobble and its kobolds speak on this computer.",
    browser: (name: string) => `As the browser (${name})`,
  },
  updatesAbout:
    "Merged work comes to this computer from GitHub; new versions of Kobble come as a card for the builder.",
  computerAbout: "For owners who do not use a terminal.",
  tracker: {
    none: "No board connected yet",
    about: (now: string) =>
      `Now: ${now}. Where the ideas you agree to become work to build.`,
    change: "Change where work is tracked",
  },
  liveApp: {
    about: "Where Kobble reads what happens in your app, every 30 minutes.",
    readsFrom: "Reads from",
    disconnect: "Disconnect",
    notConnected: "Not connected. Connect it on",
  },
  form: {
    notSaved: "Not saved",
    save: "Save",
    saved: "Saved.",
    restartToCount: " It counts once restarted:",
    restart: (name: string) => `Restart ${name}`,
    set: (label: string) => `${label} (set)`,
    replace: (help: string) => `${help} Type a new one to replace it.`,
  },
};

export const settings = area(
  en,
  {
    about:
      "Come lavora qui la fabbrica: dove si traccia il lavoro, aggiornamenti, componenti aggiuntivi e le impostazioni delle sue parti.",
    sectionsLabel: "Sezioni",
    sections: {
      language: "Lingua",
      tracker: "Dove si traccia il lavoro",
      liveApp: "L'app dal vivo",
      updates: "Aggiornamenti",
      addOns: "Componenti aggiuntivi",
      programs: "I programmi della fabbrica",
      computer: "Questo computer",
    },
    language: {
      about: "La lingua che Kobble e i suoi kobold parlano su questo computer.",
      browser: (name) => `Come il browser (${name})`,
    },
    updatesAbout:
      "Il lavoro unito arriva su questo computer da GitHub; le nuove versioni di Kobble arrivano come scheda per il costruttore.",
    computerAbout: "Per chi non usa un terminale.",
    tracker: {
      none: "Ancora nessuna bacheca collegata",
      about: (now) =>
        `Ora: ${now}. Dove le idee su cui siete d'accordo diventano lavoro da costruire.`,
      change: "Cambia dove si traccia il lavoro",
    },
    liveApp: {
      about: "Dove Kobble legge cosa succede nella tua app, ogni 30 minuti.",
      readsFrom: "Legge da",
      disconnect: "Scollega",
      notConnected: "Non collegata. Collegala in",
    },
    form: {
      notSaved: "Non salvato",
      save: "Salva",
      saved: "Salvato.",
      restartToCount: " Vale dopo il riavvio:",
      restart: (name) => `Riavvia ${name}`,
      set: (label) => `${label} (impostato)`,
      replace: (help) => `${help} Scrivine uno nuovo per sostituirlo.`,
    },
  },
  {
    about:
      "Wie die Fabrik hier arbeitet: wo die Arbeit verfolgt wird, Updates, Erweiterungen und die Einstellungen ihrer Teile.",
    sectionsLabel: "Abschnitte",
    sections: {
      language: "Sprache",
      tracker: "Wo die Arbeit verfolgt wird",
      liveApp: "Die Live-App",
      updates: "Updates",
      addOns: "Erweiterungen",
      programs: "Die Programme der Fabrik",
      computer: "Dieser Computer",
    },
    language: {
      about:
        "Die Sprache, die Kobble und seine Kobolde auf diesem Computer sprechen.",
      browser: (name) => `Wie der Browser (${name})`,
    },
    updatesAbout:
      "Zusammengeführte Arbeit kommt von GitHub auf diesen Computer; neue Versionen von Kobble kommen als Karte für den Baumeister.",
    computerAbout: "Für alle, die kein Terminal benutzen.",
    tracker: {
      none: "Noch kein Board verbunden",
      about: (now) =>
        `Jetzt: ${now}. Wo die Ideen, auf die ihr euch einigt, zu Arbeit zum Bauen werden.`,
      change: "Ändern, wo die Arbeit verfolgt wird",
    },
    liveApp: {
      about: "Wo Kobble liest, was in deiner App passiert, alle 30 Minuten.",
      readsFrom: "Liest von",
      disconnect: "Trennen",
      notConnected: "Nicht verbunden. Verbinde sie unter",
    },
    form: {
      notSaved: "Nicht gespeichert",
      save: "Speichern",
      saved: "Gespeichert.",
      restartToCount: " Es gilt nach einem Neustart:",
      restart: (name) => `${name} neu starten`,
      set: (label) => `${label} (gesetzt)`,
      replace: (help) => `${help} Gib einen neuen ein, um ihn zu ersetzen.`,
    },
  },
);
