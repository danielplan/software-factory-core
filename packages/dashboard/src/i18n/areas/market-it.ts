// The Marketplace in Italian (market.ts).

import type { marketEnglish } from "./market-en.ts";

export const marketItalian: typeof marketEnglish = {
  about: "Cosa sa fare la tua fabbrica e con quali servizi lavora.",
  tabsLabel: "Marketplace",
  tabs: {
    extensions: "Estensioni",
    connections: "Collegamenti",
    kits: "Kit di prodotto",
  },
  search: "Cerca estensioni",
  filterLabel: "Filtro",
  filters: {
    all: "Tutte",
    installed: "Installate",
    kobble: "Di Kobble",
    team: "Del tuo team",
  },
  sections: { installed: "Installate", available: "Disponibili" },
  noMatch:
    "Nessuna estensione corrisponde. Prova altre parole, o chiedine una tutta tua a Sprocket.",
  open: (name) => `Apri ${name}`,
  madeByTeam: "Fatta dal tuo team",
  madeByKobble: "Fatta da Kobble",
  states: {
    installed: "Installata",
    inUse: "In uso",
    preinstalled: "Preinstallato",
  },
  cancel: "Annulla",
  install: "Installa",
  installTitle: (names) => `Installare ${names}?`,
  installText: (name, needs, many) =>
    `${name} richiede ${needs}, che ${many ? "non sono ancora installate" : "non è ancora installata"}. Si installano insieme.`,
  installBoth: (names) => `Installa ${names}`,
  remove: "Rimuovi",
  removeTitle: (name) => `Rimuovere ${name}?`,
  goes: (what) => `Se ne va: ${what}.`,
  stays: (what) => `Resta nei file della fabbrica: ${what}.`,
  staysOther: "ciò che ha prodotto",
  its: {
    page: "la sua pagina",
    blocks: "i suoi blocchi di Home",
    kobolds: "il suo kobold",
  },
  neededBy: (names, name, many) =>
    `${names} ${many ? "richiedono" : "richiede"} ${name}. Rimuovi prima ${many ? "queste" : "questa"}.`,
  always: "Sempre necessaria",
  alwaysBecause: (why) => `Sempre necessaria: ${why}`,
  why: { factory: "costruisce tutto" },
  nothingNeedsIt: "Nessuna estensione installata la richiede.",
  noProduct: "Ancora nessun prodotto.",
  sectionsOf: {
    brings: "Cosa porta",
    needs: "Richiede",
    neededBy: "Richiesta da",
    usedBy: "Usata da",
    settings: "Impostazioni",
  },
  brings: {
    page: (n) => (n === 1 ? "Pagina" : "Pagine"),
    blocks: "Blocchi di Home",
    stage: (n) => (n === 1 ? "Fase" : "Fasi"),
    kobold: () => "Kobold",
  },
  stages: {
    build: "Fabbrica",
    explore: "Esplorazioni",
    signals: "Segnali",
    done: "Fatto",
    release: "Release",
  },
  blocks: {
    status: "Stato del prodotto",
    waiting: "Aspetta te",
    loop: "Il ciclo",
    reviews: "Revisioni aperte",
    exploring: "In esplorazione",
    signals: "Nuovi segnali",
  },
  slots: { code: "Il tuo codice", tasks: "Le tue attività" },
  kitBrings: {
    rules: "Regole",
    starter: "Un punto di partenza",
    checks: "Controlli",
    tools: "Strumenti per i kobold",
  },
  extensions: {
    factory: {
      name: "Fabbrica",
      about: "La bacheca dove il lavoro viene costruito, da fare a fatto.",
    },
    explorations: {
      name: "Esplorazioni",
      about: "Esplora un'idea con il kobold prima di costruire qualcosa.",
    },
    signals: {
      name: "Segnali",
      about:
        "Ciò che l'app dal vivo segnala: bug, desideri e come viene usata.",
    },
    personas: {
      name: "Personas",
      about: "Clienti inventati che usano l'app e ti dicono cosa non funziona.",
    },
    releases: {
      name: "Release",
      about: "Numeri e note per ogni release del tuo prodotto.",
    },
    github: {
      name: "Bacheca GitHub",
      about: "Lavoro tracciato su una bacheca GitHub, con la GitHub CLI.",
    },
    jira: {
      name: "Jira Cloud",
      about: "Lavoro tracciato in un progetto Jira Cloud, con un token API.",
    },
  },
  staysIn: {
    explorations: "le sue esplorazioni",
    signals: "i suoi segnali",
    personas: "le sue personas e le loro missioni",
    releases: "le sue release",
  },
  connections: {
    code: {
      title: "Il tuo codice",
      about: "Branch e pull request.",
      name: "GitHub",
      line: "Il tuo codice e le sue pull request, con la GitHub CLI.",
    },
    tasks: {
      title: "Le tue attività",
      about: "Dove si tengono le schede della Fabbrica. Scegline una.",
    },
    connect: "Collega",
    switchTo: (name) => `Passa a ${name}`,
    switchShort: { github: "GitHub", jira: "Jira" },
    switchTitle: (from, to) => `Passare da ${from} a ${to}?`,
    switchText: (to) => `Le tue schede restano dove sono. Poi colleghi ${to}.`,
    switchGo: "Continua",
  },
  // A page or block a team's own extension describes.
  screen: {
    emptyList: "Ancora niente qui.",
    from: (name: string) => `Da ${name}`,
  },
  kits: {
    about:
      "Kobble arriva con questi kit. Ognuno insegna ai kobold un tipo di prodotto.",
  },
};
