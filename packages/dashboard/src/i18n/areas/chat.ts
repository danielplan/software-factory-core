// The controls every chat with a kobold shares (components/chat-send.tsx).

import { area } from "../define.ts";

const en = {
  send: "Send",
  steer: "Send now: it joins the answer being written",
  stop: "Stop",
};

export const chat = area(
  en,
  {
    send: "Invia",
    steer: "Invia ora: entra nella risposta che sta scrivendo",
    stop: "Ferma",
  },
  {
    send: "Senden",
    steer: "Jetzt senden: fließt in die Antwort ein, die gerade entsteht",
    stop: "Stopp",
  },
);
