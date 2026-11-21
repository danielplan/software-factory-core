// Signals: the page, connecting the live app, before launch, all quiet.

import { area } from "../define.ts";

const en = {
  cannotRead: "The signals cannot be read",
  syncFailed: "The last sync with the live app did not work",
  noneNew: "No new signals.",
  newSignals: "New signals",
  syncedNothing: "Synced with the live app · nothing new",
  syncedNew: (n: number) => `Synced with the live app · ${String(n)} new`,
  syncNow: "Sync now",
  signal: (id: string) => `Signal ${id}`,
  fix: "Fix",
  dismiss: "Dismiss",
  ok: "OK",
  reads: {
    bug: "people report, and errors and failed automations",
    request: "people send, and when the assistant can’t do something",
    feedback: "from persona tests and everything else",
  },
  connect: {
    seeHere: "What you’ll see here",
    title: "Connect your app",
    reads: (app: string) =>
      `Kobble reads what happens in ${app} every 30 minutes.`,
    address: "Address of the export",
    token: "Token",
    tokenHint: "Paste the token from your app",
    checking: "Checking…",
    connect: "Connect",
    saved: "Saved on this computer only, in .env",
    privacy: (app: string) =>
      `Only anonymous events leave ${app}: no names, no entries.`,
    how: "How to add the export to your app",
  },
  quiet: {
    none: (app: string) => `No new bugs, requests or feedback from ${app}.`,
    hide: "Hide handled signals",
    see: "See handled signals",
    nothingHandled: "Nothing handled yet",
  },
  before: {
    sendMore: "Send more personas",
    toImprove: "to find what to improve.",
    afterLaunch: "After launch,",
    connectApp: (app: string) => `connect ${app}`,
    toHear: "to hear from customers.",
    onMission: "On a mission",
    noCustomers:
      "No customers yet. Send your personas to try the app, and what they find shows up here.",
    send: "Send a persona",
  },
};

export const signals = area(
  en,
  {
    cannotRead: "Non riesco a leggere i segnali",
    syncFailed:
      "L'ultima sincronizzazione con l'app dal vivo non ha funzionato",
    noneNew: "Nessun nuovo segnale.",
    newSignals: "Nuovi segnali",
    syncedNothing: "Sincronizzato con l'app dal vivo · niente di nuovo",
    syncedNew: (n) => `Sincronizzato con l'app dal vivo · ${String(n)} nuovi`,
    syncNow: "Sincronizza ora",
    signal: (id) => `Segnale ${id}`,
    fix: "Correggi",
    dismiss: "Scarta",
    ok: "OK",
    reads: {
      bug: "che le persone segnalano, ed errori e automazioni fallite",
      request:
        "che le persone mandano, e quando l'assistente non riesce a fare qualcosa",
      feedback: "dai test delle personas e tutto il resto",
    },
    connect: {
      seeHere: "Cosa vedrai qui",
      title: "Collega la tua app",
      reads: (app) => `Kobble legge cosa succede in ${app} ogni 30 minuti.`,
      address: "Indirizzo dell'esportazione",
      token: "Token",
      tokenHint: "Incolla il token dalla tua app",
      checking: "Controllo…",
      connect: "Collega",
      saved: "Salvato solo su questo computer, in .env",
      privacy: (app) =>
        `Da ${app} escono solo eventi anonimi: niente nomi, niente contenuti.`,
      how: "Come aggiungere l'esportazione alla tua app",
    },
    quiet: {
      none: (app) => `Nessun nuovo bug, richiesta o feedback da ${app}.`,
      hide: "Nascondi i segnali gestiti",
      see: "Vedi i segnali gestiti",
      nothingHandled: "Ancora niente di gestito",
    },
    before: {
      sendMore: "Manda altre personas",
      toImprove: "per trovare cosa migliorare.",
      afterLaunch: "Dopo il lancio,",
      connectApp: (app) => `collega ${app}`,
      toHear: "per sentire i clienti.",
      onMission: "In missione",
      noCustomers:
        "Ancora nessun cliente. Manda le tue personas a provare l'app: quello che trovano compare qui.",
      send: "Manda una persona",
    },
  },
  {
    cannotRead: "Die Signale können nicht gelesen werden",
    syncFailed: "Der letzte Abgleich mit der Live-App hat nicht geklappt",
    noneNew: "Keine neuen Signale.",
    newSignals: "Neue Signale",
    syncedNothing: "Mit der Live-App abgeglichen · nichts Neues",
    syncedNew: (n) => `Mit der Live-App abgeglichen · ${String(n)} neu`,
    syncNow: "Jetzt abgleichen",
    signal: (id) => `Signal ${id}`,
    fix: "Beheben",
    dismiss: "Verwerfen",
    ok: "OK",
    reads: {
      bug: "die Leute melden, dazu Fehler und gescheiterte Automationen",
      request: "die Leute schicken, und wenn der Assistent etwas nicht kann",
      feedback: "aus Persona-Tests und alles andere",
    },
    connect: {
      seeHere: "Was du hier sehen wirst",
      title: "Verbinde deine App",
      reads: (app) => `Kobble liest alle 30 Minuten, was in ${app} passiert.`,
      address: "Adresse des Exports",
      token: "Token",
      tokenHint: "Füge den Token aus deiner App ein",
      checking: "Prüfe…",
      connect: "Verbinden",
      saved: "Nur auf diesem Computer gespeichert, in .env",
      privacy: (app) =>
        `Nur anonyme Ereignisse verlassen ${app}: keine Namen, keine Einträge.`,
      how: "So fügst du den Export zu deiner App hinzu",
    },
    quiet: {
      none: (app) =>
        `Keine neuen Fehler, Wünsche oder Rückmeldungen aus ${app}.`,
      hide: "Erledigte Signale ausblenden",
      see: "Erledigte Signale ansehen",
      nothingHandled: "Noch nichts erledigt",
    },
    before: {
      sendMore: "Schicke mehr Personas los,",
      toImprove: "um zu finden, was besser werden kann.",
      afterLaunch: "Nach dem Start:",
      connectApp: (app) => `verbinde ${app},`,
      toHear: "um von Kunden zu hören.",
      onMission: "Auf Mission",
      noCustomers:
        "Noch keine Kunden. Schicke deine Personas los, um die App auszuprobieren: Was sie finden, erscheint hier.",
      send: "Eine Persona losschicken",
    },
  },
);
