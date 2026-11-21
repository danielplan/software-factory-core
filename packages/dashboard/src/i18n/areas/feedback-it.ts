// Feedback in Italian (feedback.ts).

import { clip, type feedbackEnglish } from "./feedback-en.ts";

export const feedbackItalian: typeof feedbackEnglish = {
  row: "Invia un feedback",
  hit: "La fabbrica ha avuto un errore",
  notNow: "Non ora",
  report: "Segnala questo errore",
  errorTitle: (text) => `Errore: ${clip(text)}`,
  reportTitle: "Segnala questo errore",
  reportIntro:
    "I dettagli sono già scritti. Aggiungi due parole su cosa stavi facendo; vedi tutto prima che parta.",
  title: "Invia un feedback a chi fa Kobble",
  intro:
    "Un desiderio o qualcosa che non va, in poche parole. Va sulla bacheca pubblica dei feedback su GitHub, dove chi fa Kobble risponde. Il tuo codice e il tuo prodotto restano privati.",
  kinds: { bug: "Qualcosa non va", wish: "Vorrei…" },
  short: "In una riga",
  shortBug: "Il builder si ferma quando…",
  shortWish: "Aiuterebbe se…",
  what: "Cosa stavi facendo, e cosa ti aspettavi",
  whatWish: "Cosa volevi fare, e perché",
  withErrors: "Errori rilevati dalla fabbrica, da inviare con il feedback",
  toCheck: "Vedi cosa parte",
  cancel: "Annulla",
  checkTitle: "Questo è tutto ciò che parte",
  checkIntro: (board) =>
    `Parola per parola, come sarà sulla bacheca pubblica (${board}). Cambia quello che vuoi, o togli una parte.`,
  teamData:
    "Gli errori possono contenere dati del tuo team: nomi, repository, titoli di card. La bacheca è pubblica: cambia o togli ciò che deve restare a voi.",
  partTitle: "Titolo",
  partText: "Quello che hai scritto",
  partWhere: "Dove",
  pageWord: "pagina",
  partError: (at) => `Errore delle ${at}`,
  remove: "Togli",
  putBack: "Rimetti",
  nothingElse:
    "Non parte nient'altro: nessun file, nessun codice, nessun dato del tuo prodotto.",
  sendsAs: "Inviato con il tuo account GitHub",
  notYou: "Non sei tu?",
  signInFirst: "Si invia con il tuo account GitHub.",
  signIn: "Accedi con GitHub",
  back: "Indietro",
  send: "Invia alla bacheca",
  thanks: "Grazie, è sulla bacheca",
  onBoard: "Chi fa Kobble lo legge lì; altri team possono aggiungere un 👍.",
  follow:
    "Qui vedi a che punto è: visto quando l'hanno letto, previsto quando lo faranno, fatto quando è in un nuovo Kobble.",
  another: "Inviane un altro",
  close: "Chiudi",
  states: {
    sent: "Inviato",
    seen: "Visto",
    planned: "Previsto",
    done: "Fatto",
  },
  stateHelp: {
    sent: "Sulla bacheca, non ancora letto",
    seen: "Chi fa Kobble l'ha letto",
    planned: "Chi fa Kobble lo farà",
    done: "È in un nuovo Kobble",
  },
  filterAll: "Tutti",
  filterFeedback: "Feedback",
  you: "Tu",
  change: "Cambia",
  noPersona: "Ancora nessuna persona",
  personaSure: (name, why) => `Sprocket pensa che sia ${name}: ${why}.`,
  personaPicked: (name) => `Hai detto che è ${name}.`,
  personaUnsure: "Sprocket non è sicuro di chi sia.",
  teamsWant: (n) =>
    n === 1 ? "👍 1 team lo vuole" : `👍 ${String(n)} team lo vogliono`,
  mine: "I tuoi sulla bacheca",
  board: "Vedi la bacheca",
  similar: "Già sulla bacheca",
  similarHelp: "Se uno è il tuo, aggiungi un 👍 invece di uno nuovo.",
  thumbs: (n) => `👍 ${String(n)}`,
  chat: {
    placeholder: "Vorrei poter…, oppure: si blocca quando…",
    hint: "Un desiderio, o qualcosa che non va? Dimmelo con parole tue: lo scrivo io per chi fa Kobble.",
    invite:
      "Dimmelo con parole tue: qualcosa che vorresti da Kobble, o qualcosa che non è andato. Lo scrivo io per chi lo fa, sulla loro bacheca pubblica.",
    askWish:
      "Bella idea. Cosa ci faresti? Un momento del tuo lavoro aiuta di più.",
    askBug:
      "Mi dispiace. Cosa stavi facendo quando è successo, e cosa ti aspettavi?",
    askError: (error) =>
      `La fabbrica ha avuto questo errore:\n\n\`${error}\`\n\nCosa stavi facendo quando è successo?`,
    askAgain: "Succede ogni volta?",
    again: ["Ogni volta", "Solo una volta", "Non so"],
    skip: "Salta",
    similar: (teams) =>
      `Lo vogliono anche altri ${String(teams)} team. Aggiungi il tuo 👍 invece di un nuovo post?`,
    similarBug: (teams) =>
      `È successo anche ad altri ${String(teams)} team. Aggiungi il tuo 👍 invece di un nuovo post?`,
    addThumb: "Aggiungi il mio 👍",
    different: "Il mio è diverso",
    thumbed: (n) =>
      `Il tuo 👍 è su #${String(n)}. Ti dico qui quando si muove.`,
    draft:
      "Ecco cosa invierei. Cambia quello che vuoi, o dimmi cosa aggiungere.",
    draftTeam:
      "Ho segnato ciò che sembra un dato del tuo team (nomi, repository, titoli di card). La bacheca è pubblica: clicca un segno per toglierlo.",
    added: "L'ho aggiunto alla descrizione.",
    kindWord: { bug: "Bug", wish: "Desiderio" },
    description: "Descrizione",
    goesAlong: "Va con il post",
    version: "Versione",
    page: "Pagina",
    taken: "[tolto]",
    send: "Invia",
    posted: (n) =>
      `Inviato come #${String(n)} sulla bacheca pubblica. Lo seguo qui: visto, previsto, fatto.`,
    moved: {
      sent: (n) => `#${String(n)} è sulla bacheca.`,
      seen: (n) => `Chi fa Kobble ha letto #${String(n)}.`,
      planned: (n) => `#${String(n)} è previsto: lo faranno.`,
      done: (n) => `#${String(n)} è fatto: è in un nuovo Kobble.`,
    },
  },
};
