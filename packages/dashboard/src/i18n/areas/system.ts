// System: the product's parts as a map, their buttons and lights, what
// the page says about them, and the parts' problems the launcher reports.

import { area } from "../define.ts";

const en = {
  about:
    "What your product is made of and how its parts connect. Start, stop and open them here.",
  startAll: "Start all",
  stopAll: "Stop all",
  didNotWork: "That did not work",
  yourProduct: "Your product",
  noPartsBefore: "No parts to run yet: they come with your first idea, on the",
  noPartsAfter: " page.",
  programs: "The factory's own programs",
  headline: {
    none: "No parts to run yet: they come with your first idea.",
    problem: (count: number) =>
      (count === 1 ? "One part" : String(count) + " parts") +
      " could not start: the card says why and what to do.",
    starting: "Starting your product…",
    running: "Everything is running: open it to try it.",
    some: "Some parts are running: start the others to try everything.",
    stopped:
      "Your product is not running. Start it to try it on this computer.",
  },
  part: {
    starting: (step: string) => `Starting · ${step}`,
    outside: "Running, started outside the factory",
    withOthers: "Runs with the products that use it",
    open: "Open",
    details: "Technical details",
    tryAgain: "Try again",
    start: "Start",
    restart: "Restart",
    stop: "Stop",
  },
  // The launcher's problem titles, with what they name.
  problems: {
    portElsewhere: (port: string) =>
      `Address ${port} is used by a program from another folder`,
    waiting: (part: string, missing: string) =>
      `${part} is waiting for ${missing}`,
    settingsMissing: (file: string) => `The settings file ${file} is missing`,
    portUsed: (port: string) => `Address ${port} is used by another program`,
    stepFailed: (step: string, part: string) =>
      `"${step}" didn't work for ${part}`,
    noAnswer: (part: string, seconds: string) =>
      `${part} did not answer within ${seconds} seconds`,
  },
};

export const system = area(
  en,
  {
    about:
      "Di cosa è fatto il tuo prodotto e come si collegano le sue parti. Avviale, fermale e aprile da qui.",
    startAll: "Avvia tutto",
    stopAll: "Ferma tutto",
    didNotWork: "Non ha funzionato",
    yourProduct: "Il tuo prodotto",
    noPartsBefore:
      "Ancora nessuna parte da avviare: arrivano con la tua prima idea, nella pagina",
    noPartsAfter: ".",
    programs: "I programmi della fabbrica",
    headline: {
      none: "Ancora nessuna parte da avviare: arrivano con la tua prima idea.",
      problem: (count) =>
        (count === 1
          ? "Una parte non è partita"
          : String(count) + " parti non sono partite") +
        ": la scheda dice perché e cosa fare.",
      starting: "Avvio il tuo prodotto…",
      running: "È tutto in funzione: aprilo per provarlo.",
      some: "Alcune parti sono in funzione: avvia le altre per provare tutto.",
      stopped:
        "Il tuo prodotto non è in funzione. Avvialo per provarlo su questo computer.",
    },
    part: {
      starting: (step) => `In avvio · ${step}`,
      outside: "In funzione, avviato fuori dalla fabbrica",
      withOthers: "Funziona insieme ai prodotti che lo usano",
      open: "Apri",
      details: "Dettagli tecnici",
      tryAgain: "Riprova",
      start: "Avvia",
      restart: "Riavvia",
      stop: "Ferma",
    },
    problems: {
      portElsewhere: (port) =>
        `L'indirizzo ${port} è usato da un programma di un'altra cartella`,
      waiting: (part, missing) => `${part} aspetta ${missing}`,
      settingsMissing: (file) => `Manca il file delle impostazioni ${file}`,
      portUsed: (port) => `L'indirizzo ${port} è usato da un altro programma`,
      stepFailed: (step, part) => `"${step}" non ha funzionato per ${part}`,
      noAnswer: (part, seconds) =>
        `${part} non ha risposto entro ${seconds} secondi`,
    },
  },
  {
    about:
      "Woraus dein Produkt besteht und wie seine Teile zusammenhängen. Starte, stoppe und öffne sie hier.",
    startAll: "Alle starten",
    stopAll: "Alle stoppen",
    didNotWork: "Das hat nicht geklappt",
    yourProduct: "Dein Produkt",
    noPartsBefore:
      "Noch keine Teile zum Starten: Sie kommen mit deiner ersten Idee, auf der Seite",
    noPartsAfter: ".",
    programs: "Die eigenen Programme der Fabrik",
    headline: {
      none: "Noch keine Teile zum Starten: Sie kommen mit deiner ersten Idee.",
      problem: (count) =>
        (count === 1 ? "Ein Teil konnte" : String(count) + " Teile konnten") +
        " nicht starten: Die Karte sagt, warum und was zu tun ist.",
      starting: "Dein Produkt startet…",
      running: "Alles läuft: Öffne es, um es auszuprobieren.",
      some: "Einige Teile laufen: Starte die anderen, um alles auszuprobieren.",
      stopped:
        "Dein Produkt läuft nicht. Starte es, um es auf diesem Computer auszuprobieren.",
    },
    part: {
      starting: (step) => `Startet · ${step}`,
      outside: "Läuft, außerhalb der Fabrik gestartet",
      withOthers: "Läuft mit den Produkten, die es nutzen",
      open: "Öffnen",
      details: "Technische Details",
      tryAgain: "Nochmal versuchen",
      start: "Starten",
      restart: "Neu starten",
      stop: "Stoppen",
    },
    problems: {
      portElsewhere: (port) =>
        `Die Adresse ${port} wird von einem Programm aus einem anderen Ordner benutzt`,
      waiting: (part, missing) => `${part} wartet auf ${missing}`,
      settingsMissing: (file) => `Die Einstellungsdatei ${file} fehlt`,
      portUsed: (port) =>
        `Die Adresse ${port} wird von einem anderen Programm benutzt`,
      stepFailed: (step, part) => `„${step}" hat für ${part} nicht geklappt`,
      noAnswer: (part, seconds) =>
        `${part} hat nicht innerhalb von ${seconds} Sekunden geantwortet`,
    },
  },
);
