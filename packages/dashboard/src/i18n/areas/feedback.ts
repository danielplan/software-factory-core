// Sending feedback to the people who make the factory: the row in the
// sidebar and its form (feedback/feedback-row.tsx).

import { area } from "../define.ts";

const en = {
  row: "Send feedback",
  caught: (n: number) =>
    n === 1 ? "1 error caught" : `${String(n)} errors caught`,
  title: "Send feedback to the makers of Kobble",
  intro:
    "It goes on the public feedback board, a GitHub repository just for feedback. The makers read it there, and other teams can add a 👍. Your code and your product stay private.",
  kinds: { bug: "Something is wrong", wish: "I wish…" },
  short: "In one line",
  shortBug: "The builder stops when…",
  shortWish: "It would help if…",
  what: "What happened, and what you expected",
  whatWish: "What you wanted to do, and why",
  sent: "Sent with it",
  version: (version: string) => `Kobble ${version}`,
  page: (page: string) => `The page you are on: ${page}`,
  errors: (n: number) =>
    n === 1
      ? "1 error the factory caught"
      : `${String(n)} errors the factory caught`,
  noErrors: "No errors caught since the factory started",
  nothingElse:
    "Nothing else: no names, files or data from your product. You see it all on GitHub before you send.",
  similar: "Already on the board",
  similarHelp: "If one is yours, add a 👍 instead of a new one.",
  thumbs: (n: number) => `👍 ${String(n)}`,
  madeUp: "made up for this prototype",
  account: "You need a GitHub account. It opens GitHub with all of it filled in; you press Create there.",
  open: "Open on GitHub",
  cancel: "Cancel",
  done: "Sent? Thank you. It is on the board, where you can follow the answer.",
  board: "See the board",
  another: "Send another",
};

export const feedback = area(
  en,
  {
    row: "Invia un feedback",
    caught: (n) => (n === 1 ? "1 errore rilevato" : `${String(n)} errori rilevati`),
    title: "Invia un feedback a chi fa Kobble",
    intro:
      "Va sulla bacheca pubblica dei feedback, un repository GitHub solo per i feedback. Chi fa Kobble lo legge lì, e altri team possono aggiungere un 👍. Il tuo codice e il tuo prodotto restano privati.",
    kinds: { bug: "Qualcosa non va", wish: "Vorrei…" },
    short: "In una riga",
    shortBug: "Il builder si ferma quando…",
    shortWish: "Aiuterebbe se…",
    what: "Cosa è successo, e cosa ti aspettavi",
    whatWish: "Cosa volevi fare, e perché",
    sent: "Inviato con",
    version: (version) => `Kobble ${version}`,
    page: (page) => `La pagina in cui sei: ${page}`,
    errors: (n) =>
      n === 1 ? "1 errore rilevato dalla fabbrica" : `${String(n)} errori rilevati dalla fabbrica`,
    noErrors: "Nessun errore da quando la fabbrica è partita",
    nothingElse:
      "Nient'altro: nessun nome, file o dato del tuo prodotto. Vedi tutto su GitHub prima di inviare.",
    similar: "Già sulla bacheca",
    similarHelp: "Se uno è il tuo, aggiungi un 👍 invece di uno nuovo.",
    thumbs: (n) => `👍 ${String(n)}`,
    madeUp: "inventati per questo prototipo",
    account: "Serve un account GitHub. Si apre GitHub con tutto già scritto; lì premi Create.",
    open: "Apri su GitHub",
    cancel: "Annulla",
    done: "Inviato? Grazie. È sulla bacheca, dove puoi seguire la risposta.",
    board: "Vedi la bacheca",
    another: "Inviane un altro",
  },
  {
    row: "Feedback senden",
    caught: (n) => (n === 1 ? "1 Fehler aufgefangen" : `${String(n)} Fehler aufgefangen`),
    title: "Feedback an die Macher von Kobble senden",
    intro:
      "Es kommt auf das öffentliche Feedback-Board, ein GitHub-Repository nur für Feedback. Die Macher lesen es dort, und andere Teams können ein 👍 geben. Dein Code und dein Produkt bleiben privat.",
    kinds: { bug: "Etwas stimmt nicht", wish: "Ich wünsche mir…" },
    short: "In einer Zeile",
    shortBug: "Der Builder hält an, wenn…",
    shortWish: "Es würde helfen, wenn…",
    what: "Was passiert ist, und was du erwartet hast",
    whatWish: "Was du tun wolltest, und warum",
    sent: "Mitgeschickt",
    version: (version) => `Kobble ${version}`,
    page: (page) => `Die Seite, auf der du bist: ${page}`,
    errors: (n) =>
      n === 1 ? "1 Fehler, den die Fabrik aufgefangen hat" : `${String(n)} Fehler, die die Fabrik aufgefangen hat`,
    noErrors: "Keine Fehler, seit die Fabrik läuft",
    nothingElse:
      "Sonst nichts: keine Namen, Dateien oder Daten aus deinem Produkt. Du siehst alles auf GitHub, bevor du sendest.",
    similar: "Schon auf dem Board",
    similarHelp: "Ist eins davon deins, gib ein 👍 statt eines neuen.",
    thumbs: (n) => `👍 ${String(n)}`,
    madeUp: "für diesen Prototyp erfunden",
    account: "Du brauchst ein GitHub-Konto. GitHub öffnet sich mit allem ausgefüllt; dort drückst du Create.",
    open: "Auf GitHub öffnen",
    cancel: "Abbrechen",
    done: "Gesendet? Danke. Es ist auf dem Board, wo du die Antwort verfolgen kannst.",
    board: "Board ansehen",
    another: "Noch eins senden",
  },
);
