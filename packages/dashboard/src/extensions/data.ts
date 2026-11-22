// Prototype: the extensions of this factory, as the extensions page shows
// them: the add-ons it has (real, switched for real), plus made-up ones from
// Kobble and from the team, so every kind shows. What an extension adds and
// needs is made up per id here.

import { useState } from "react";

import { messageOf, post } from "@/api";
import type { FactoryState } from "@/dashboard/dashboard";

export const STAGES = ["Signals", "Explorations", "Factory", "Done"] as const;
export type Stage = (typeof STAGES)[number];

export type Ext = {
  id: string;
  name: string;
  maker: "kobble" | "team";
  about: string;
  adds: { pages: string[]; blocks: string[]; kobolds: string[] };
  // The stages where it acts, in the loop.
  stages: Stage[];
  // The extensions it needs (their names, in `needs`, with what else it needs).
  needsIds: string[];
  needs: string[];
  on: boolean;
  // A real add-on: switched on the server; the others are made up.
  real: boolean;
  tracker: boolean;
  settings: string[];
  // Made-up settings of an extension that has none on the server.
  fields: { label: string; value: string }[];
  changes: string[];
  // A product kit: the product that uses it, and what it brings.
  kit?: { usedBy: string[]; brings: string[] };
};

const NONE = { pages: [], blocks: [], kobolds: [] };

type Made = {
  maker: Ext["maker"];
  adds: Ext["adds"];
  stages: Stage[];
  needsIds: string[];
  // What else it needs besides extensions.
  extra: string[];
  fields: Ext["fields"];
  changes: string[];
};

const base: Made = {
  maker: "kobble",
  adds: NONE,
  stages: [],
  needsIds: [],
  extra: [],
  fields: [],
  changes: [],
};

// What each real add-on adds and needs; made up.
const OF_ADD_ON: Record<string, Partial<Made>> = {
  github: {
    stages: ["Factory"],
    needsIds: ["factory"],
    extra: ["The GitHub CLI, signed in"],
  },
  jira: {
    stages: ["Factory"],
    needsIds: ["factory"],
    extra: ["A Jira API token"],
  },
};

type MadeUp = Made & {
  id: string;
  name: string;
  about: string;
  on: boolean;
};

const one = (m: Partial<Made> & Pick<MadeUp, "id" | "name" | "about" | "on">): MadeUp => ({
  ...base,
  ...m,
});

const MADE_UP: MadeUp[] = [
  one({
    id: "factory",
    name: "Factory",
    about: "The board where work is built, from to do to done.",
    adds: { pages: ["Factory"], blocks: ["Product status", "Waiting for you", "The loop", "Open reviews"], kobolds: ["Bolt"] },
    stages: ["Factory"],
    on: true,
  }),
  one({
    id: "explorations",
    name: "Explorations",
    about: "Explore an idea with the kobold before anything is built.",
    adds: { pages: ["Explorations"], blocks: ["Being explored"], kobolds: ["Doodle"] },
    stages: ["Explorations"],
    needsIds: ["factory"],
    on: true,
  }),
  one({
    id: "signals",
    name: "Signals",
    about: "What the live app reports: bugs, wishes and how it is used.",
    adds: { pages: ["Signals"], blocks: ["New signals"], kobolds: ["Sieve"] },
    stages: ["Signals"],
    on: true,
  }),
  one({
    id: "personas",
    name: "Personas",
    about: "Made-up customers who use the app and tell you what breaks.",
    adds: { pages: ["Personas"], blocks: [], kobolds: ["Mimic"] },
    stages: ["Signals"],
    needsIds: ["signals"],
    on: false,
  }),
  one({
    id: "releases",
    name: "Releases",
    about: "Numbers and notes for each release of your product.",
    adds: { pages: ["Releases"], blocks: [], kobolds: [] },
    stages: ["Done"],
    needsIds: ["factory"],
    on: true,
  }),
  one({
    id: "voice",
    name: "Voice",
    about: "Talk to the kobolds and hear them answer.",
    adds: { pages: [], blocks: [], kobolds: ["A voice for every kobold"] },
    on: false,
  }),
  one({
    id: "verification",
    name: "Verification",
    about: "Sends a persona through a change before it is merged.",
    adds: { pages: [], blocks: ["Failed check"], kobolds: ["Mimic"] },
    stages: ["Factory"],
    needsIds: ["personas", "factory"],
    on: false,
  }),
  one({
    id: "standup",
    name: "Daily standup",
    maker: "team",
    about: "A short page each morning: what moved yesterday, what waits today.",
    adds: {
      pages: ["Standup"],
      blocks: [],
      kobolds: ["Standup kobold"],
    },
    stages: ["Signals", "Factory"],
    needsIds: ["signals", "factory"],
    on: false,
    fields: [
      { label: "Time", value: "09:30" },
      { label: "Where it is posted", value: "#team-standup" },
    ],
    changes: [
      "Written by Doodle from “a morning page for the team” · 12 Nov",
      "You asked for a short summary of yesterday · 14 Nov",
    ],
  }),
];

const KEY = "kobble.made-up-extensions";
const TRACKER_KEY = "kobble.made-up-cards";

function readOn(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<
      string,
      boolean
    >;
  } catch {
    return {};
  }
}

// Every extension, with how to switch one.
export function useExtensions(state: FactoryState): {
  all: Ext[];
  turn: (id: string, on: boolean) => void;
  // Where the cards live, made up: nothing real is connected or moved.
  moveCards: (to: string) => void;
  problem: string | null;
} {
  const [madeOn, setMadeOn] = useState(readOn);
  const [cards, setCards] = useState(
    () => localStorage.getItem(TRACKER_KEY) ?? "github",
  );
  const [problem, setProblem] = useState<string | null>(null);
  const nameOf = (id: string) =>
    MADE_UP.find((m) => m.id === id)?.name ??
    state.addOns.find((a) => a.id === id)?.name ??
    id;
  const finish = (m: Made, id: string) => ({
    adds: m.adds,
    stages: m.stages,
    needsIds: m.needsIds,
    needs: [...m.needsIds.map(nameOf), ...m.extra],
    fields: m.fields,
    changes: m.changes,
    maker: m.maker,
    id,
  });
  const real: Ext[] = state.addOns.map((addOn) => ({
    ...finish({ ...base, ...OF_ADD_ON[addOn.id] }, addOn.id),
    name: addOn.name,
    about: addOn.about,
    on: addOn.tracker ? cards === addOn.id : addOn.on,
    real: true,
    tracker: addOn.tracker,
    settings: addOn.settings,
  }));
  const made: Ext[] = MADE_UP.map((m) => ({
    ...finish(m, m.id),
    name: m.name,
    about: m.about,
    on: madeOn[m.id] ?? m.on,
    real: false,
    tracker: false,
    settings: [],
  }));
  const turn = (id: string, on: boolean) => {
    setProblem(null);
    if (made.some((m) => m.id === id)) {
      const next = { ...madeOn, [id]: on };
      localStorage.setItem(KEY, JSON.stringify(next));
      setMadeOn(next);
      return;
    }
    post("/api/add-ons", { id, on }).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  const moveCards = (to: string) => {
    localStorage.setItem(TRACKER_KEY, to);
    setCards(to);
  };
  return {
    all: [...made.slice(0, 5), ...real, ...made.slice(5)],
    turn,
    moveCards,
    problem,
  };
}

// The extensions of `ext` that are needed and not installed yet.
export const missingFor = (ext: Ext, all: Ext[]): Ext[] =>
  ext.needsIds.flatMap((id) => all.filter((e) => e.id === id && !e.on));

// The installed extensions that need `ext`.
export const neededBy = (ext: Ext, all: Ext[]): Ext[] =>
  all.filter((e) => e.on && e.needsIds.includes(ext.id));

export const makerOf = (ext: Ext) => (ext.maker === "kobble" ? "Kobble" : "Your team");

// "Pages: Standup · Home blocks: …" as a list of kinds with their names.
export function addsOf(ext: Ext): { kind: string; names: string[] }[] {
  return [
    { kind: "Pages", names: ext.adds.pages },
    { kind: "Home blocks", names: ext.adds.blocks },
    { kind: "Kobolds", names: ext.adds.kobolds },
    { kind: "Stages", names: ext.stages },
  ].filter((one) => one.names.length > 0);
}

// Product kits, extensions of a special kind: made up, and not switched on or
// off: a kit comes with the first product of its kind.
const BRINGS = ["Rules", "A starter", "Checks", "Tools for the kobolds"];

const kit = (
  id: string,
  name: string,
  about: string,
  usedBy: string[],
  maker: Ext["maker"] = "kobble",
): Ext => ({
  id,
  name,
  about,
  maker,
  adds: NONE,
  stages: [],
  needsIds: [],
  needs: [],
  on: usedBy.length > 0,
  real: false,
  tracker: false,
  settings: [],
  fields: [],
  changes: [],
  kit: { usedBy, brings: BRINGS },
});

export const KITS: Ext[] = [
  kit("react-web-app", "React web app", "How a React web app is built, checked and run.", ["Acme Shop", "Acme Admin"]),
  kit("expo-app", "Expo app", "How a phone app with Expo is built, checked and run.", ["Acme Shop app"]),
  kit("nestjs-backend", "NestJS backend", "How a NestJS server is built, checked and run.", []),
  kit("sveltekit-app", "SvelteKit web app", "How a SvelteKit web app is built, checked and run.", []),
  kit("typescript-package", "TypeScript package", "How a TypeScript library is built, checked and published.", []),
  kit("shopify-theme", "Shopify theme", "How a Shopify theme is built, checked and previewed.", [], "team"),
];
