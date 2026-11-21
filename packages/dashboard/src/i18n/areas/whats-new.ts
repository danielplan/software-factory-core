// What's new in Kobble (Settings › Updates): each release's changes in the
// team's language, the status line, and the calm offline note.

import { area } from "../define.ts";

const en = {
  about:
    "What each version of Kobble changed for you. New versions arrive by themselves.",
  youAre: (version: string) => `You're on Kobble ${version}`,
  offline: "couldn't check for newer versions just now",
  checked: (when: string) => `checked ${when}`,
  tryAgain: "Try again",
  trying: "Checking…",
  onItsWay: (version: string) => `Kobble ${version} is on its way`,
  arrives: "Arriving by itself",
  noWords: "Its changes can't be read just now.",
  yours: "You're here",
  more: "More",
  less: "Less",
  releases: "Releases of Kobble",
  changesOf: (version: string) => `What changed in Kobble ${version}`,
  empty: "There are no words about releases on this computer yet.",
  problem: "What's new could not be read on this computer.",
  kinds: { New: "New", Changed: "Changed", Fixed: "Fixed" },
};

type WhatsNewWords = typeof en;

const it: WhatsNewWords = {
  about:
    "Cosa ha cambiato per te ogni versione di Kobble. Le nuove versioni arrivano da sole.",
  youAre: (version) => `Stai usando Kobble ${version}`,
  offline: "non sono riuscito a cercare versioni più nuove",
  checked: (when) => `controllato ${when}`,
  tryAgain: "Riprova",
  trying: "Controllo…",
  onItsWay: (version) => `Kobble ${version} sta arrivando`,
  arrives: "Arriva da solo",
  noWords: "Per ora non riesco a leggere le sue novità.",
  yours: "Sei qui",
  more: "Altro",
  less: "Meno",
  releases: "Versioni di Kobble",
  changesOf: (version) => `Cosa è cambiato in Kobble ${version}`,
  empty: "Su questo computer non ci sono ancora parole sulle versioni.",
  problem: "Non sono riuscito a leggere le novità su questo computer.",
  kinds: { New: "Novità", Changed: "Cambiato", Fixed: "Corretto" },
};

const de: WhatsNewWords = {
  about:
    "Was jede Version von Kobble für dich geändert hat. Neue Versionen kommen von selbst.",
  youAre: (version) => `Du bist auf Kobble ${version}`,
  offline: "konnte gerade nicht nach neueren Versionen schauen",
  checked: (when) => `geprüft ${when}`,
  tryAgain: "Nochmal versuchen",
  trying: "Prüfe…",
  onItsWay: (version) => `Kobble ${version} ist unterwegs`,
  arrives: "Kommt von selbst",
  noWords: "Die Änderungen lassen sich gerade nicht lesen.",
  yours: "Du bist hier",
  more: "Mehr",
  less: "Weniger",
  releases: "Versionen von Kobble",
  changesOf: (version) => `Was sich in Kobble ${version} geändert hat`,
  empty: "Auf diesem Computer gibt es noch keine Worte zu Versionen.",
  problem: "Das Neue konnte auf diesem Computer nicht gelesen werden.",
  kinds: { New: "Neu", Changed: "Geändert", Fixed: "Behoben" },
};

export const whatsNew = area(en, it, de);
