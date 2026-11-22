// The builder at work: its trace in a card's panel, and the cards it got
// stuck on, above the Factory board, with why and for how long.

import { area } from "../define.ts";

const en = {
  trace: {
    card: "Card",
    tab: (n: number) => `Trace · ${String(n)}`,
    steps: (n: number) => (n === 1 ? "1 step" : `${String(n)} steps`),
    live: " · live",
    nothingYet: "Nothing yet.",
  },
  stuck: {
    title: "Stuck",
    count: (n: number) =>
      n === 1
        ? "1 card the builder could not finish"
        : `${String(n)} cards the builder could not finish`,
    seeCard: "See the whole card",
    answerOn: (n: number) => `Answer the builder on card #${String(n)}`,
    placeholder: "Answer the builder, give it a hint, or ask Sprocket",
    sending: "Sending…",
    send: "Send and let it try again",
    continue: "Continue",
    carryOn: "Carry on where you stopped.",
    ask: "Ask Sprocket",
    askAbout: (n: number, title: string, question: string) =>
      `Card #${String(n)} “${title}” is stuck. ${question || "What is going on, and what should I do?"}`,
    hintIfAny: "A hint for the next sessions, if you like",
    pick: "Pick an answer",
    suggested: "Suggested",
  },
  why: {
    checksFailed: "The checks stayed red after three tries.",
    failed: "The builder could not finish it.",
    outOfSessions:
      "It used its three sessions and is not finished yet. Continue gives it three more.",
    asks: (question: string) => `The builder asks: ${question}`,
    stopped: "The builder stopped and asks you.",
  },
  since: {
    justNow: "Stuck just now",
    minutes: (n: number) => `Stuck for ${String(n)} min`,
    hours: (n: number) => `Stuck for ${String(n)} h`,
    days: (n: number) =>
      n === 1 ? "Stuck for 1 day" : `Stuck for ${String(n)} days`,
  },
};

export const builder = area(
  en,
  {
    trace: {
      card: "Scheda",
      tab: (n) => `Traccia · ${String(n)}`,
      steps: (n) => (n === 1 ? "1 passo" : `${String(n)} passi`),
      live: " · dal vivo",
      nothingYet: "Ancora niente.",
    },
    stuck: {
      title: "Bloccate",
      count: (n) =>
        n === 1
          ? "1 scheda che il costruttore non ha potuto finire"
          : `${String(n)} schede che il costruttore non ha potuto finire`,
      seeCard: "Vedi tutta la scheda",
      answerOn: (n) => `Rispondi al costruttore sulla scheda #${String(n)}`,
      placeholder:
        "Rispondi al costruttore, dagli un suggerimento o chiedi a Sprocket",
      sending: "Invio…",
      send: "Invia e lascialo riprovare",
      continue: "Continua",
      carryOn: "Continua da dove ti sei fermato.",
      ask: "Chiedi a Sprocket",
      askAbout: (n, title, question) =>
        `La scheda #${String(n)} “${title}” è bloccata. ${question || "Cosa succede, e cosa devo fare?"}`,
      hintIfAny: "Un suggerimento per le prossime sessioni, se vuoi",
      pick: "Scegli una risposta",
      suggested: "Suggerita",
    },
    why: {
      checksFailed: "I controlli sono rimasti rossi dopo tre tentativi.",
      failed: "Il costruttore non è riuscito a finirla.",
      outOfSessions:
        "Ha usato le sue tre sessioni e non ha ancora finito. Continua gliene dà altre tre.",
      asks: (question) => `Il costruttore chiede: ${question}`,
      stopped: "Il costruttore si è fermato e ti chiede.",
    },
    since: {
      justNow: "Bloccata ora",
      minutes: (n) => `Bloccata da ${String(n)} min`,
      hours: (n) => `Bloccata da ${String(n)} h`,
      days: (n) =>
        n === 1 ? "Bloccata da 1 giorno" : `Bloccata da ${String(n)} giorni`,
    },
  },
  {
    trace: {
      card: "Karte",
      tab: (n) => `Verlauf · ${String(n)}`,
      steps: (n) => (n === 1 ? "1 Schritt" : `${String(n)} Schritte`),
      live: " · live",
      nothingYet: "Noch nichts.",
    },
    stuck: {
      title: "Festgefahren",
      count: (n) =>
        n === 1
          ? "1 Karte, die der Baumeister nicht fertigstellen konnte"
          : `${String(n)} Karten, die der Baumeister nicht fertigstellen konnte`,
      seeCard: "Die ganze Karte ansehen",
      answerOn: (n) => `Dem Baumeister auf Karte #${String(n)} antworten`,
      placeholder:
        "Antworte dem Baumeister, gib ihm einen Hinweis oder frag Sprocket",
      sending: "Wird gesendet…",
      send: "Senden und neu versuchen lassen",
      continue: "Weiter",
      carryOn: "Mach dort weiter, wo du aufgehört hast.",
      ask: "Sprocket fragen",
      askAbout: (n, title, question) =>
        `Karte #${String(n)} „${title}“ steckt fest. ${question || "Was ist los, und was soll ich tun?"}`,
      hintIfAny: "Ein Hinweis für die nächsten Sitzungen, wenn du willst",
      pick: "Eine Antwort wählen",
      suggested: "Vorgeschlagen",
    },
    why: {
      checksFailed: "Die Prüfungen blieben nach drei Versuchen rot.",
      failed: "Der Baumeister konnte sie nicht fertigstellen.",
      outOfSessions:
        "Er hat seine drei Sitzungen gebraucht und ist noch nicht fertig. Weiter gibt ihm drei weitere.",
      asks: (question) => `Der Baumeister fragt: ${question}`,
      stopped: "Der Baumeister hat angehalten und fragt dich.",
    },
    since: {
      justNow: "Gerade festgefahren",
      minutes: (n) => `Seit ${String(n)} Min. festgefahren`,
      hours: (n) => `Seit ${String(n)} Std. festgefahren`,
      days: (n) =>
        n === 1
          ? "Seit 1 Tag festgefahren"
          : `Seit ${String(n)} Tagen festgefahren`,
    },
  },
);
