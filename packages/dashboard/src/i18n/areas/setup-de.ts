// Setting up Kobble, in German (setup.ts has the English and the keys).

import type { SetupWords } from "./setup.ts";

export const setupGerman: SetupWords = {
  hi: "Hallo, ich bin dein Kobold.",
  tellMe: "Sag mir, was du bauen willst, und ich richte Kobble mit dir ein.",
  reading: "Ich lese dein Projekt…",
  read: "Ich habe dein Projekt gelesen, du musst nur bestätigen, was ich gefunden habe. Gehen wir es durch.",
  stepOf: (n, of) => `Schritt ${String(n)} von ${String(of)}`,
  whereStart: "Wo fangen wir an?",
  steps: {
    hello: { name: "Willkommen", hint: "Der Kobold liest" },
    product: { name: "Dein Produkt", hint: "Was es ist, wie weit" },
    people: { name: "Für wen", hint: "Die Menschen, für die du baust" },
    team: { name: "Team und Board", hint: "Wer daran arbeitet, wo" },
    how: { name: "Wie Kobble arbeitet", hint: "Erweiterungen, das Aussehen" },
    bring: { name: "Mitnehmen", hint: "Was du schon hast" },
    setup: { name: "Einrichten", hint: "Kobble schreibt alles" },
    start: { name: "Erste Erkundung", hint: "Mit echter Arbeit anfangen" },
  },
  leads: {
    hello:
      "Ich habe dein Projekt gelesen, du musst nur bestätigen, was ich gefunden habe. Geh die Schritte durch; du kannst jederzeit zurück.",
    product: "Was dein Produkt ist, seine Teile, und wie weit es ist.",
    people:
      "Die Menschen, für die du baust. Kobble prüft Ideen an ihnen, also sollten sie echt sein. Füge deine eigenen hinzu.",
    team: "Wer daran arbeitet, und wo die Arbeit verfolgt wird. Alle können alles.",
    how: "Die Teile von Kobble, die zu eurer Arbeitsweise passen. Du kannst sie später in den Einstellungen ändern.",
    bring: "Was du schon hast, und was damit passiert.",
    start:
      "Wähle eine, und Kobble öffnet sie mit schon begonnenem Board. Oder schau dich erst um.",
  },
  says: {
    product:
      "Hier ist dein Produkt, wie ich es gelesen habe. Klick auf eine Karte, um sie zu korrigieren, oder nimm sie weg.",
    people:
      "Das sind die Menschen, für die du wohl baust. Füge die echten hinzu, die du kennst.",
    team: "Ich habe in der Geschichte gefunden, wer daran arbeitet, und wo die Arbeit verfolgt wird.",
    how: "Das passt zu eurer bisherigen Arbeitsweise. Ändere, was du willst.",
    bring: "Das hast du schon, und das passiert damit.",
    setup:
      "Wenn du auf Kobble einrichten drückst, schreibe ich alles in dein Repository.",
    start: "Nach dem, was ich gelesen habe, lohnt es sich, hiermit anzufangen.",
    changing: "Einen Moment, ich ändere die Karten…",
    answerOn: (title) => `Antwort: ${title}`,
    yourAnswer: "Deine Antwort",
    answer: "Antworten",
  },
  rail: {
    label: "Schritte der Einrichtung",
    settingUp: "Richte ein",
    minutes:
      "Etwa 7 Minuten. Du kannst später alles in den Einstellungen und bei den Personas ändern.",
    working: "Arbeitet…",
    help: "Hier, um zu helfen",
    back: "Zurück",
    nextWrites: "Als Nächstes schreibt Kobble all das in dein Repository.",
    canChange: "Du kannst das später ändern.",
  },
  bar: {
    continue: "Weiter",
    go: "Los geht’s",
    pickStart: "Wähle, wo es losgeht",
    setUp: "Kobble einrichten",
    open: "Öffnen",
    look: "Erst umschauen",
  },
  found: {
    reading: "Lese…",
    nothing: "Nichts gefunden",
    cards: (n) => `${String(n)} ${n === 1 ? "Karte" : "Karten"}`,
    questions: (found, n) =>
      found + ", " + (n === 1 ? "1 Frage" : String(n) + " Fragen") + " an dich",
  },
  guess: {
    from: (source) => `aus ${source}`,
    agreed: "bestätigt",
    guessFrom: (source) => `meine Vermutung, aus ${source}`,
    guess: "meine Vermutung",
  },
  cards: {
    forEveryone: "Für alle",
    addOns: "Erweiterungen",
    look: "Das Aussehen",
    lookNote: "für alle",
    apps: "Gefundene Apps",
    appsNote: (n) => `${String(n)} Apps`,
    alsoHere: "Auch in deinem Projekt",
    everyone:
      "Alle können alles. Kobble nutzt diese Liste nur, um zu erkennen, wer an einem Computer sitzt.",
    board: "Dein Board",
    building:
      "Jeder Computer mit Kobble kann bauen. Eine Karte baut immer nur einer: Wer sie anfängt, schreibt es auf die Karte, und die anderen lassen sie.",
    takeOff: (title) => `${title} wegnehmen`,
    title: "Titel",
    whatItSays: "Was darauf steht",
    addCustomer: "Einen echten Kunden hinzufügen",
    who: "Wer sie sind",
    whoExample: "Eine Erstbesitzerin eines Boots",
    what: "Was sie tun und wollen",
    add: "Hinzufügen",
    cancel: "Abbrechen",
  },
  stages: {
    "An idea": "Eine Idee",
    "Built, not live yet": "Gebaut, noch nicht live",
    "Live, a few customers": "Live, ein paar Kunden",
    Live: "Live",
  },
  howFar: "Wie weit ist es?",
  myGuess: (text) => `Meine Vermutung: ${text}`,
  look: {
    yours: "Das Aussehen deiner App",
    yoursText:
      "Die Farben, Schriften und Ecken deiner App, beim Einrichten aus ihrem Code genommen, und dein Logo.",
    own: "Kobbles eigenes",
    ownText: "Das Kobold-Logo, ruhiges Grau und Blau.",
  },
  team: {
    cards: "Karten gleichzeitig",
    cardsText: "Wie viele Karten jeder Computer gleichzeitig baut.",
    usage: "Nutzungsprotokoll",
    usageText:
      "Schreibt auf, wie Kobble genutzt wird, für eine Studie. Auf dem Computer jeder Person.",
  },
  done: {
    title: "Kobble ist eingerichtet",
    lead: "Alles ist bereit. Ein letzter Schritt: Wähle, wo es losgeht.",
  },
  building: {
    title: "Kobble wird eingerichtet",
    lead: "Der Kobold schreibt alles, was wir durchgegangen sind, in dein Repository. Das dauert ein paar Minuten.",
  },
  before: {
    title: "Einrichten",
    lead: "Kobble schreibt all das in dein Repository, in einen Branch, den du ansehen kannst, bevor du ihn teilst.",
  },
  plan: {
    folder:
      "Schreibe den Ordner der Fabrik, ihre Einstellungen und die Regeln jeder App",
    apps: (n) => `Beschreibe ${String(n)} Apps und ihre Prüfungen`,
    people: (n) => `Lege ${String(n)} Menschen als Personas an`,
    board: "Verbinde das Board",
    bring:
      "Nehme mit, was du hast: die Wissensbasis nach docs/, Kobbles Fähigkeiten",
    start: (n) => `Starte ${String(n)} Erkundungen`,
  },
  coach: {
    answer: "Antworte dem Coach…",
    answerLabel: "Antworte dem Coach",
    talk: "Sprechen",
    talkTitle: "Sprechen statt tippen",
    send: "Senden",
    label: "Der Coach",
    build: "Was willst du bauen?",
    couldNot: "Der Coach konnte nicht antworten",
  },
};
