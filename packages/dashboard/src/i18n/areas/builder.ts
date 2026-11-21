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
    placeholder: "Answer the builder, or give it a hint",
    sending: "Sending…",
    send: "Send and let it try again",
    pick: "Pick an answer",
    suggested: "Suggested",
  },
  why: {
    checksFailed: "The checks stayed red after three tries.",
    failed: "The builder could not finish it.",
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
      placeholder: "Rispondi al costruttore, o dagli un suggerimento",
      sending: "Invio…",
      send: "Invia e lascialo riprovare",
      pick: "Scegli una risposta",
      suggested: "Suggerita",
    },
    why: {
      checksFailed: "I controlli sono rimasti rossi dopo tre tentativi.",
      failed: "Il costruttore non è riuscito a finirla.",
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
      placeholder: "Antworte dem Baumeister oder gib ihm einen Hinweis",
      sending: "Wird gesendet…",
      send: "Senden und neu versuchen lassen",
      pick: "Eine Antwort wählen",
      suggested: "Vorgeschlagen",
    },
    why: {
      checksFailed: "Die Prüfungen blieben nach drei Versuchen rot.",
      failed: "Der Baumeister konnte sie nicht fertigstellen.",
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
