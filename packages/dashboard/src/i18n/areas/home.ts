// Home: the line about the product, what waits for you, and the loop.

import { area } from "../define.ts";

const en = {
  about: "What waits for you, and where the work is.",
  nothingWaits: "Nothing waits for you. The kobolds are on it.",
  kinds: {
    Review: "Review",
    Answer: "Answer",
    Continue: "Continue",
    Sort: "Sort",
  },
  openPullRequest: "Open",
  review: {
    built: "Built, and its pull request waits for your review",
    waits: "Waits for your review",
  },
  asks: "The builder stopped and asks you",
  newSignals: (count: number) =>
    `${String(count)} new ${count === 1 ? "signal" : "signals"}`,
  stages: {
    newSignals: "new",
    exploring: "being explored",
    toBuild: "to build",
    toBuildAndReview: (review: number) =>
      `to build · ${String(review)} to review`,
    done: "Done",
    merged: "merged",
  },
  line: {
    building: (card: string) => `Bolt is building ${card}`,
    resting: "Bolt is resting",
    none: "No product to run yet",
    problem: "Something needs you on System",
    starting: "Starting the product",
    running: "The product is running",
    stopped: "The product is stopped",
    some: (running: number, shown: number) =>
      `${String(running)} of ${String(shown)} parts are running`,
  },
};

export const home = area(
  en,
  {
    about: "Cosa ti aspetta, e a che punto è il lavoro.",
    nothingWaits: "Niente ti aspetta. Ci pensano i kobold.",
    kinds: {
      Review: "Rivedi",
      Answer: "Rispondi",
      Continue: "Continua",
      Sort: "Smista",
    },
    openPullRequest: "Apri",
    review: {
      built: "Costruita, la sua pull request aspetta la tua revisione",
      waits: "Aspetta la tua revisione",
    },
    asks: "Il costruttore si è fermato e ti chiede",
    newSignals: (count) =>
      `${String(count)} ${count === 1 ? "nuovo segnale" : "nuovi segnali"}`,
    stages: {
      newSignals: "nuovi",
      exploring: "in esplorazione",
      toBuild: "da costruire",
      toBuildAndReview: (review) =>
        `da costruire · ${String(review)} da rivedere`,
      done: "Fatto",
      merged: "unite",
    },
    line: {
      building: (card) => `Bolt costruisce ${card}`,
      resting: "Bolt riposa",
      none: "Ancora nessun prodotto da avviare",
      problem: "Qualcosa ha bisogno di te su Sistema",
      starting: "Avvio il prodotto",
      running: "Il prodotto è in funzione",
      stopped: "Il prodotto è fermo",
      some: (running, shown) =>
        `${String(running)} di ${String(shown)} parti in funzione`,
    },
  },
  {
    about: "Was auf dich wartet, und wo die Arbeit steht.",
    nothingWaits: "Nichts wartet auf dich. Die Kobolde kümmern sich darum.",
    kinds: {
      Review: "Prüfen",
      Answer: "Antworten",
      Continue: "Weiter",
      Sort: "Sortieren",
    },
    openPullRequest: "Öffnen",
    review: {
      built: "Gebaut, der Pull Request wartet auf deine Prüfung",
      waits: "Wartet auf deine Prüfung",
    },
    asks: "Der Baumeister hat angehalten und fragt dich",
    newSignals: (count) =>
      `${String(count)} ${count === 1 ? "neues Signal" : "neue Signale"}`,
    stages: {
      newSignals: "neu",
      exploring: "in Erkundung",
      toBuild: "zu bauen",
      toBuildAndReview: (review) => `zu bauen · ${String(review)} zu prüfen`,
      done: "Erledigt",
      merged: "zusammengeführt",
    },
    line: {
      building: (card) => `Bolt baut ${card}`,
      resting: "Bolt ruht",
      none: "Noch kein Produkt zum Starten",
      problem: "Etwas braucht dich im System",
      starting: "Das Produkt startet",
      running: "Das Produkt läuft",
      stopped: "Das Produkt ist gestoppt",
      some: (running, shown) =>
        `${String(running)} von ${String(shown)} Teilen laufen`,
    },
  },
);
