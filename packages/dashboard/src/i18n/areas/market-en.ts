// The Marketplace in English (market.ts): the extensions, the connections
// and the product kits, and the words of what an extension brings. Kobble's
// own extensions and the services they connect to have their names and
// lines here, by id; an extension this list does not know (a team's own)
// shows its own.

export const marketEnglish = {
  about: "What your factory can do, and the services it works with.",
  tabsLabel: "Marketplace",
  tabs: {
    extensions: "Extensions",
    connections: "Connections",
    kits: "Product kits",
  },
  search: "Search extensions",
  filterLabel: "Filter",
  filters: {
    all: "All",
    installed: "Installed",
    kobble: "Kobble's",
    team: "Your team's",
  },
  sections: { installed: "Installed", available: "Available" },
  noMatch:
    "No extension matches. Try other words, or ask Sprocket for one of your own.",
  open: (name: string) => `Open ${name}`,
  madeByTeam: "Made by your team",
  madeByKobble: "Made by Kobble",
  states: {
    installed: "Installed",
    inUse: "In use",
    preinstalled: "Pre-installed",
  },
  cancel: "Cancel",
  install: "Install",
  installTitle: (names: string) => `Install ${names}?`,
  installText: (name: string, needs: string, many: boolean) =>
    `${name} needs ${needs}, which ${many ? "are" : "is"} not installed yet. They are installed together.`,
  installBoth: (names: string) => `Install ${names}`,
  remove: "Remove",
  removeTitle: (name: string) => `Remove ${name}?`,
  goes: (what: string) => `Goes: ${what}.`,
  stays: (what: string) => `Stays in the factory's files: ${what}.`,
  staysOther: "what it made",
  its: {
    page: "its page",
    blocks: "its Home blocks",
    kobolds: "its kobold",
  },
  neededBy: (names: string, name: string, many: boolean) =>
    `${names} ${many ? "need" : "needs"} ${name}. Remove ${many ? "them" : "it"} first.`,
  always: "Always needed",
  alwaysBecause: (why: string) => `Always needed: ${why}`,
  why: { factory: "it builds everything" },
  nothingNeedsIt: "Nothing installed needs it.",
  noProduct: "No product yet.",
  sectionsOf: {
    brings: "What it brings",
    needs: "Needs",
    neededBy: "Needed by",
    usedBy: "Used by",
    settings: "Settings",
  },
  brings: {
    page: (n: number): string => (n === 1 ? "Page" : "Pages"),
    blocks: "Home blocks",
    stage: (n: number): string => (n === 1 ? "Stage" : "Stages"),
    kobold: (n: number): string => (n === 1 ? "Kobold" : "Kobolds"),
  },
  stages: {
    build: "Factory",
    explore: "Explorations",
    signals: "Signals",
    release: "Done",
  },
  blocks: {
    status: "Product status",
    waiting: "Waiting for you",
    loop: "The loop",
    reviews: "Open reviews",
    exploring: "Being explored",
    signals: "New signals",
  },
  slots: { code: "Your code", tasks: "Your tasks" },
  kitBrings: {
    rules: "Rules",
    starter: "A starter",
    checks: "Checks",
    tools: "Tools for the kobolds",
  },
  extensions: {
    factory: {
      name: "Factory",
      about: "The board where work is built, from to do to done.",
    },
    explorations: {
      name: "Explorations",
      about: "Explore an idea with the kobold before anything is built.",
    },
    signals: {
      name: "Signals",
      about: "What the live app reports: bugs, wishes and how it is used.",
    },
    personas: {
      name: "Personas",
      about: "Made-up customers who use the app and tell you what breaks.",
    },
    releases: {
      name: "Releases",
      about: "Numbers and notes for each release of your product.",
    },
    github: {
      name: "GitHub board",
      about: "Work tracked on a GitHub board, through the GitHub CLI.",
    },
    jira: {
      name: "Jira Cloud",
      about: "Work tracked in a Jira Cloud project, with an API token.",
    },
  },
  staysIn: {
    explorations: "its explorations",
    signals: "its signals",
    personas: "its personas and their missions",
    releases: "its releases",
  },
  connections: {
    code: {
      title: "Your code",
      about: "Branches and pull requests.",
      name: "GitHub",
      line: "Your code and its pull requests, through the GitHub CLI.",
    },
    tasks: {
      title: "Your tasks",
      about: "Where the Factory's cards are kept. Pick one.",
    },
    connect: "Connect",
    switchTo: (name: string) => `Switch to ${name}`,
    switchShort: { github: "GitHub", jira: "Jira" },
    switchTitle: (from: string, to: string) => `Switch from ${from} to ${to}?`,
    switchText: (to: string) =>
      `Your cards stay where they are. Next you connect ${to}.`,
    switchGo: "Continue",
  },
  kits: {
    about:
      "Kobble comes with these kits. Each teaches the kobolds one kind of product.",
  },
};
