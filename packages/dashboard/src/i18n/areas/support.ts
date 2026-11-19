// Sprocket's support bar, at the bottom of every page.

import { area } from "../define.ts";

const en = {
  answering: (name: string) => `${name} is answering…`,
  ask: (name: string) => `Ask ${name} anything`,
  role: "Support · reads your project, changes nothing",
  newConversation: "New conversation",
  close: "Close",
  empty:
    "Ask how Kobble works, where something is, or anything about your product.",
  thinking: "Thinking…",
  question: "Ask a question",
  send: "Send",
};

export const support = area(
  en,
  {
    answering: (name) => `${name} sta rispondendo…`,
    ask: (name) => `Chiedi qualsiasi cosa a ${name}`,
    role: "Supporto · legge il tuo progetto, non cambia niente",
    newConversation: "Nuova conversazione",
    close: "Chiudi",
    empty:
      "Chiedi come funziona Kobble, dove si trova qualcosa, o qualsiasi cosa sul tuo prodotto.",
    thinking: "Ci penso…",
    question: "Fai una domanda",
    send: "Invia",
  },
  {
    answering: (name) => `${name} antwortet…`,
    ask: (name) => `Frag ${name} alles`,
    role: "Hilfe · liest dein Projekt, ändert nichts",
    newConversation: "Neues Gespräch",
    close: "Schließen",
    empty:
      "Frag, wie Kobble funktioniert, wo etwas ist, oder alles über dein Produkt.",
    thinking: "Denkt nach…",
    question: "Stell eine Frage",
    send: "Senden",
  },
);
