// Setting up Kobble, in Italian (setup.ts has the English and the keys).

import type { SetupWords } from "./setup.ts";

export const setupItalian: SetupWords = {
  hi: "Ciao, sono il tuo kobold.",
  tellMe: "Dimmi cosa vuoi costruire, e preparo Kobble con te.",
  reading: "Sto leggendo il tuo progetto…",
  read: "Ho letto il tuo progetto, così devi solo confermare cosa ho trovato. Vediamolo insieme.",
  stepOf: (n, of) => `Passo ${String(n)} di ${String(of)}`,
  whereStart: "Da dove cominciamo?",
  steps: {
    hello: { name: "Benvenuto", hint: "Il kobold legge" },
    product: { name: "Il tuo prodotto", hint: "Cos'è, a che punto è" },
    people: { name: "Per chi è", hint: "Le persone per cui costruisci" },
    team: { name: "Team e bacheca", hint: "Chi ci lavora, dove" },
    how: {
      name: "Come lavora Kobble",
      hint: "Componenti aggiuntivi, l'aspetto",
    },
    bring: { name: "Porta con te", hint: "Quello che hai già" },
    setup: { name: "Prepara", hint: "Kobble scrive tutto" },
    start: { name: "Prima esplorazione", hint: "Comincia con lavoro vero" },
  },
  leads: {
    hello:
      "Ho letto il tuo progetto, così devi solo confermare cosa ho trovato. Segui i passi; puoi sempre tornare indietro.",
    product: "Cos'è il tuo prodotto, le sue parti, e a che punto è arrivato.",
    people:
      "Le persone per cui costruisci. Kobble mette alla prova le idee con loro, quindi devono essere vere. Aggiungi le tue.",
    team: "Chi ci lavora, e dove si traccia il lavoro. Tutti possono fare tutto.",
    how: "Le parti di Kobble adatte al vostro modo di lavorare. Puoi cambiarle più avanti in Impostazioni.",
    bring: "Quello che hai già, e cosa succede con esso.",
    start:
      "Scegline una e Kobble la apre con la lavagna già avviata. Oppure prima dai un'occhiata in giro.",
  },
  says: {
    product:
      "Ecco il tuo prodotto come l'ho letto. Clicca una scheda per correggerla, o toglila.",
    people:
      "Queste sono le persone per cui penso tu costruisca. Aggiungi quelle vere che conosci.",
    team: "Ho trovato chi ci lavora nella cronologia, e dove si traccia il lavoro.",
    how: "Queste si adattano a come avete lavorato finora. Cambia quello che vuoi.",
    bring: "Questo è quello che hai già, e cosa succede con esso.",
    setup: "Quando premi Prepara Kobble, scrivo tutto nel tuo repository.",
    start: "Da quello che ho letto, vale la pena cominciare con queste.",
    changing: "Un momento, sto cambiando le schede…",
    answerOn: (title) => `Risposta: ${title}`,
    yourAnswer: "La tua risposta",
    answer: "Rispondi",
  },
  rail: {
    label: "Passi della preparazione",
    settingUp: "Preparo",
    minutes:
      "Circa 7 minuti. Puoi cambiare tutto più avanti in Impostazioni e Personas.",
    working: "Al lavoro…",
    help: "Qui per aiutarti",
    back: "Indietro",
    nextWrites: "Poi Kobble scrive tutto questo nel tuo repository.",
    canChange: "Puoi cambiarlo più avanti.",
  },
  bar: {
    continue: "Continua",
    go: "Andiamo",
    pickStart: "Scegli da dove cominciare",
    setUp: "Prepara Kobble",
    open: "Aprila",
    look: "Prima do un'occhiata",
  },
  found: {
    reading: "Leggo…",
    nothing: "Niente trovato",
    cards: (n) => `${String(n)} ${n === 1 ? "scheda" : "schede"}`,
    questions: (found, n) =>
      found +
      ", " +
      (n === 1 ? "1 domanda" : String(n) + " domande") +
      " per te",
  },
  guess: {
    from: (source) => `da ${source}`,
    agreed: "confermato",
    guessFrom: (source) => `la mia ipotesi, da ${source}`,
    guess: "la mia ipotesi",
  },
  connected: "Collegato",
  now: (activity) => `Ora: ${activity}`,
  cards: {
    forEveryone: "Per tutti",
    addOns: "Componenti aggiuntivi",
    look: "L'aspetto",
    lookNote: "per tutti",
    apps: "App che ho trovato",
    appsNote: (n) => `${String(n)} app`,
    alsoHere: "Anche nel tuo progetto",
    everyone:
      "Tutti possono fare tutto. Kobble usa questa lista solo per riconoscere chi è a un computer.",
    board: "La tua bacheca",
    building:
      "Ogni computer con Kobble può costruire. Una scheda la costruisce uno alla volta: chi la inizia lo scrive sulla scheda, e gli altri la lasciano.",
    takeOff: (title) => `Togli ${title}`,
    title: "Titolo",
    whatItSays: "Cosa dice",
    addCustomer: "Aggiungi un cliente vero",
    who: "Chi è",
    whoExample: "Un primo proprietario di barca",
    what: "Cosa fa e cosa vuole",
    add: "Aggiungi",
    cancel: "Annulla",
  },
  stages: {
    "An idea": "Un'idea",
    "Built, not live yet": "Costruito, non ancora dal vivo",
    "Live, a few customers": "Dal vivo, pochi clienti",
    Live: "Dal vivo",
  },
  howFar: "A che punto è?",
  myGuess: (text) => `La mia ipotesi: ${text}`,
  look: {
    yours: "L'aspetto della tua app",
    yoursText:
      "I colori, i caratteri e gli angoli della tua app, presi dal suo codice quando Kobble viene preparato, e il tuo logo.",
    own: "Quello di Kobble",
    ownText: "Il logo del kobold, grigio calmo e blu.",
  },
  team: {
    cards: "Schede alla volta",
    cardsText: "Quante schede costruisce ogni computer nello stesso momento.",
    usage: "Registro d'uso",
    usageText:
      "Annota come si usa Kobble, per uno studio. Tenuto sul computer di ognuno.",
  },
  done: {
    title: "Kobble è pronto",
    lead: "È tutto a posto. Un ultimo passo: scegli da dove cominciare.",
  },
  building: {
    title: "Preparo Kobble",
    lead: "Il kobold scrive nel tuo repository tutto quello che abbiamo visto. Ci vogliono alcuni minuti.",
  },
  before: {
    title: "Prepara",
    lead: "Kobble scrive tutto questo nel tuo repository, in un ramo che puoi guardare prima di condividerlo.",
  },
  plan: {
    folder:
      "Scrivo la cartella della fabbrica, le sue impostazioni e le regole di ogni app",
    apps: (n) => `Descrivo ${String(n)} app e i loro controlli`,
    people: (n) => `Aggiungo ${String(n)} persone come personas`,
    board: "Collego la bacheca",
    bring:
      "Porto con me quello che hai: la base di conoscenza in docs/, le abilità di Kobble",
    start: (n) => `Avvio ${String(n)} esplorazioni`,
  },
  coach: {
    answer: "Rispondi al coach…",
    answerLabel: "Rispondi al coach",
    talk: "Parla",
    talkTitle: "Parla invece di scrivere",
    send: "Invia",
    label: "Il coach",
    build: "Cosa vuoi costruire?",
    couldNot: "Il coach non è riuscito a rispondere",
  },
};
