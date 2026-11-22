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
    placeholder: "Answer the builder, ask it something, or give it a hint",
    sending: "Sending…",
    send: "Send and let it try again",
    continue: "Continue",
    carryOn: "Carry on where you stopped.",
    hintIfAny:
      "Ask the builder something, or give it a hint for the next sessions",
    ask: "Ask",
    talk: "Your questions and the builder's replies",
    you: "You",
    builder: "Builder",
    answering: "The builder is reading the work to answer…",
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
        "Rispondi al costruttore, chiedigli qualcosa o dagli un suggerimento",
      sending: "Invio…",
      send: "Invia e lascialo riprovare",
      continue: "Continua",
      carryOn: "Continua da dove ti sei fermato.",
      hintIfAny:
        "Chiedi qualcosa al costruttore, o dagli un suggerimento per le prossime sessioni",
      ask: "Chiedi",
      talk: "Le tue domande e le risposte del costruttore",
      you: "Tu",
      builder: "Costruttore",
      answering: "Il costruttore legge il lavoro per rispondere…",
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
        "Antworte dem Baumeister, frag ihn etwas oder gib ihm einen Hinweis",
      sending: "Wird gesendet…",
      send: "Senden und neu versuchen lassen",
      continue: "Weiter",
      carryOn: "Mach dort weiter, wo du aufgehört hast.",
      hintIfAny:
        "Frag den Baumeister etwas oder gib ihm einen Hinweis für die nächsten Sitzungen",
      ask: "Fragen",
      talk: "Deine Fragen und die Antworten des Baumeisters",
      you: "Du",
      builder: "Baumeister",
      answering: "Der Baumeister liest die Arbeit, um zu antworten…",
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
