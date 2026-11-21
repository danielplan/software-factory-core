// Feedback in German (feedback.ts).

import { clip, type feedbackEnglish } from "./feedback-en.ts";

export const feedbackGerman: typeof feedbackEnglish = {
  row: "Feedback senden",
  hit: "Die Fabrik ist auf einen Fehler gestoßen",
  notNow: "Nicht jetzt",
  report: "Diesen Fehler melden",
  errorTitle: (text) => `Fehler: ${clip(text)}`,
  reportTitle: "Diesen Fehler melden",
  reportIntro:
    "Die Einzelheiten sind schon ausgefüllt. Schreib kurz, was du gerade gemacht hast; du siehst alles, bevor es rausgeht.",
  title: "Feedback an die Macher von Kobble senden",
  intro:
    "Ein Wunsch oder etwas, das nicht stimmt, in ein paar Worten. Es kommt auf das öffentliche Feedback-Board auf GitHub, wo die Macher antworten. Dein Code und dein Produkt bleiben privat.",
  kinds: { bug: "Etwas stimmt nicht", wish: "Ich wünsche mir…" },
  short: "In einer Zeile",
  shortBug: "Der Builder hält an, wenn…",
  shortWish: "Es würde helfen, wenn…",
  what: "Was du gemacht hast, und was du erwartet hast",
  whatWish: "Was du tun wolltest, und warum",
  withErrors: "Fehler, die die Fabrik aufgefangen hat, zum Mitschicken",
  toCheck: "Ansehen, was rausgeht",
  cancel: "Abbrechen",
  checkTitle: "Das ist alles, was rausgeht",
  checkIntro: (board) =>
    `Wort für Wort, wie es auf dem öffentlichen Board stehen wird (${board}). Ändere, was du willst, oder nimm einen Teil heraus.`,
  teamData:
    "Fehler können Daten deines Teams enthalten: Namen, Repositories, Kartentitel. Das Board ist öffentlich: ändere oder entferne, was bei euch bleiben soll.",
  partTitle: "Titel",
  partText: "Was du geschrieben hast",
  partWhere: "Wo",
  pageWord: "Seite",
  partError: (at) => `Fehler um ${at}`,
  remove: "Entfernen",
  putBack: "Zurückholen",
  nothingElse:
    "Sonst geht nichts raus: keine Dateien, kein Code, keine Daten aus deinem Produkt.",
  sendsAs: "Gesendet mit deinem GitHub-Konto",
  notYou: "Nicht du?",
  signInFirst: "Gesendet wird mit deinem eigenen GitHub-Konto.",
  signIn: "Mit GitHub anmelden",
  back: "Zurück",
  send: "Ans Board senden",
  thanks: "Danke, es ist auf dem Board",
  onBoard: "Die Macher lesen es dort; andere Teams können ein 👍 geben.",
  follow:
    "Hier siehst du, wie es steht: gesehen, wenn die Macher es gelesen haben, geplant, wenn sie es machen, erledigt, wenn es in einem neuen Kobble ist.",
  another: "Noch eins senden",
  close: "Schließen",
  states: {
    sent: "Gesendet",
    seen: "Gesehen",
    planned: "Geplant",
    done: "Erledigt",
  },
  stateHelp: {
    sent: "Auf dem Board, noch nicht gelesen",
    seen: "Die Macher haben es gelesen",
    planned: "Die Macher werden es machen",
    done: "Es ist in einem neuen Kobble",
  },
  filterAll: "Alle",
  filterFeedback: "Feedback",
  you: "Du",
  change: "Ändern",
  noPersona: "Noch keine Persona",
  personaSure: (name, why) => `Sprocket denkt, das ist ${name}: ${why}.`,
  personaPicked: (name) => `Du hast gesagt, das ist ${name}.`,
  personaUnsure: "Sprocket ist nicht sicher, wer das ist.",
  teamsWant: (n) =>
    n === 1 ? "👍 1 Team will das" : `👍 ${String(n)} Teams wollen das`,
  mine: "Deine auf dem Board",
  board: "Board ansehen",
  similar: "Schon auf dem Board",
  similarHelp: "Ist eins davon deins, gib ein 👍 statt eines neuen.",
  thumbs: (n) => `👍 ${String(n)}`,
  chat: {
    placeholder: "Ich wünschte, ich könnte…, oder: es hängt, wenn…",
    hint: "Ein Wunsch, oder stimmt etwas nicht? Sag es mir in deinen Worten: ich schreibe es für die Macher von Kobble auf.",
    invite:
      "Sag es mir in deinen Worten: etwas, das Kobble können sollte, oder etwas, das schiefging. Ich schreibe es für die Macher auf, auf ihr öffentliches Board.",
    askWish:
      "Gute Idee. Was würdest du damit tun? Ein Moment aus deiner Arbeit hilft den Machern am meisten.",
    askBug:
      "Tut mir leid. Was hast du gerade gemacht, und was hast du erwartet?",
    askError: (error) =>
      `Die Fabrik ist auf diesen Fehler gestoßen:\n\n\`${error}\`\n\nWas hast du gerade gemacht?`,
    askAgain: "Passiert es jedes Mal?",
    again: ["Jedes Mal", "Nur einmal", "Weiß nicht"],
    skip: "Überspringen",
    similar: (teams) =>
      `${String(teams)} Teams wollen das auch. Dein 👍 dazu statt eines neuen Posts?`,
    similarBug: (teams) =>
      `${String(teams)} Teams ist das auch passiert. Dein 👍 dazu statt eines neuen Posts?`,
    addThumb: "Mein 👍 dazu",
    different: "Meins ist anders",
    thumbed: (n) =>
      `Dein 👍 ist auf #${String(n)}. Ich sag dir hier, wenn sich etwas tut.`,
    draft:
      "So würde ich es senden. Ändere, was du willst, oder sag mir, was dazu soll.",
    draftTeam:
      "Ich habe markiert, was nach Daten deines Teams aussieht (Namen, Repositories, Kartentitel). Das Board ist öffentlich: klick eine Markierung, um sie herauszunehmen.",
    added: "Hab ich zur Beschreibung dazugeschrieben.",
    kindWord: { bug: "Fehler", wish: "Wunsch" },
    description: "Beschreibung",
    goesAlong: "Geht mit",
    version: "Version",
    page: "Seite",
    taken: "[entfernt]",
    send: "Senden",
    posted: (n) =>
      `Gesendet als #${String(n)} auf das öffentliche Board. Ich verfolge es hier: gesehen, geplant, erledigt.`,
    moved: {
      sent: (n) => `#${String(n)} ist auf dem Board.`,
      seen: (n) => `Die Macher haben #${String(n)} gelesen.`,
      planned: (n) => `#${String(n)} ist geplant: die Macher machen es.`,
      done: (n) => `#${String(n)} ist erledigt: es ist in einem neuen Kobble.`,
    },
  },
  window: {
    howCanIHelp: "Wie kann ich helfen?",
    reportIt: "Melden",
    choices: {
      bug: "Etwas stimmt nicht",
      wish: "Ich wünschte, Kobble könnte…",
      ask: "Eine Frage stellen",
    },
    here: {
      home: { text: "Fehlt dir etwas auf Home? Sag es mir" },
      system: {
        text: "Ein Produkt sieht falsch aus? Melde es",
        said: "Ein Produkt auf der Seite System sieht falsch aus",
      },
      signals: { text: "Fehlt eine Art von Signal? Sag es mir" },
      explore: {
        text: "Der Prototyp ist nicht, was du wolltest? Melde es",
        said: "Ein Prototyp zeigt nicht, was ich wollte",
      },
      build: {
        text: "Der Baumeister hat angehalten? Melde es",
        said: "Der Baumeister hat angehalten",
      },
      releases: {
        text: "Ein Release ging schief? Melde es",
        said: "Das Release hat nicht geklappt",
      },
      personas: { text: "Sollen Personas mehr können? Sag es mir" },
      settings: { text: "Findest du eine Einstellung nicht? Frag mich" },
    },
    starts: {
      startBug: {
        line: "Das tut mir leid. Was ist schiefgegangen?",
        examples: [
          "Der Baumeister hat mittendrin angehalten",
          "Meine Karten werden nicht angezeigt",
          "Eine Seite zeigt einen Fehler",
        ],
      },
      startWish: {
        line: "Sag mir, was Kobble können soll.",
        examples: [
          "An zwei Karten gleichzeitig arbeiten",
          "Signale aus Slack sehen",
          "Das Board exportieren",
        ],
      },
      startAsk: {
        line: "Was möchtest du wissen?",
        examples: [
          "Wie starte ich einen Bau?",
          "Was ist eine Persona?",
          "Woher kommen Signale?",
        ],
      },
    },
    replies: {
      askWish: ["Es würde mir Zeit sparen", "Mein Team fragt ständig danach"],
      askBug: ["Ich habe auf Bauen geklickt", "Es ist von selbst passiert"],
      askError: [
        "Ich habe eine Karte zu Bauen verschoben",
        "Nichts, es hat einfach angehalten",
      ],
    },
    lines: {
      askError:
        "Ich habe den Fehler oben in den Beitrag gesetzt. Was hast du gemacht, als es passiert ist?",
      draft: "Hier ist er, oben. Ändere, was du willst, oder sende ihn.",
      added: "Zum Beitrag hinzugefügt.",
      cleaned: "Erledigt: die Daten deines Teams sind draußen.",
    },
    askBugAfterSorry:
      "Was hast du gemacht, als es passiert ist, und was hast du erwartet?",
    similar: (teams, bug) =>
      `${String(teams)} Teams ${bug ? "sind auch darauf gestoßen" : "wollen das auch"}:`,
    thumbed: (n) => `Dein 👍 ist auf #${String(n)}. Ich verfolge es oben.`,
    posted: (n) => `Gesendet als #${String(n)}. Ich verfolge es oben.`,
    placeholders: {
      choose: "Frag, oder sag mir, was nicht stimmt…",
      ask: "Stell eine Frage…",
      listen: "Sag es mit deinen Worten…",
      question: "Deine Antwort…",
      again: "Deine Antwort…",
      similar: "Oder erzähl mir mehr…",
      draft: "Sag mir, was ich ändern soll…",
      sent: "Sonst noch etwas?",
    },
    takeOut: "Die Daten meines Teams entfernen",
    addDetail: "Ein Detail hinzufügen",
    somethingElse: "Etwas anderes",
    startOver: "Neu anfangen",
    alreadyOnBoard: "Schon auf dem Board?",
    kinds: { bug: "Fehler", wish: "Wunsch" },
    newPost: "neuer Beitrag",
    ready: "Bereit zum Senden",
    writing: "Schreibt sich gerade…",
    titleLabel: "Titel",
    errorPrefix: "Fehler: ",
    publicBoard: (remove) => `${remove}: das Board ist öffentlich`,
    signedInAs: (name) => `als @${name}`,
    withSignIn: "mit deiner GitHub-Anmeldung",
    send: "Senden",
    sendPost: "Den Beitrag senden",
    typeBefore: "Gib",
    typeAfter: "auf github.com/login/device ein, dann sende ich es.",
    sendMessage: "Deine Nachricht senden",
  },
};
