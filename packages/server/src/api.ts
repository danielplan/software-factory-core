// What the server and the web interface say to each other: the state the
// page shows, and the requests its buttons send. The web interface imports
// these types only.

import type { Company, GroupView } from "@software-factory/core";

import type { Board } from "./connect/board-file.ts";
import type { PartView } from "@software-factory/launcher";

export type KitView = {
  id: string;
  name: string;
  about: string;
  kind: string;
  canCreate: boolean;
};

export type ProductView = {
  id: string;
  name: string;
  kind: string;
  // The kit that knows its kind.
  kit: string;
  about: string;
  folder: string;
  port: number | null;
  commands: Record<string, string>;
  users: { who: string; does: string }[];
};

// Work that takes a while (making a new product with its starter): what it
// is, how far it is, and what went wrong.
export type Job = {
  id: string;
  label: string;
  state: "waiting" | "working" | "done" | "failed";
  log: string[];
};

// A card on the connected board, as the Board tab shows it.
export type CardView = {
  number: number;
  title: string;
  stage: Stage | null;
  column: string;
  url: string;
};

// What the builder is doing: on or off, the card it works on, its last
// step, and what went wrong last.
export type BuilderView = {
  on: boolean;
  working: { number: number; title: string; what: string } | null;
  activity: string | null;
  problem: string | null;
};

// The coach answering in the cards: on or off, and the card it answers.
export type CoachInCardsView = { on: boolean; working: number | null };

export type WorkView = {
  cards: CardView[];
  // Why the cards could not be read last time.
  problem: string | null;
  // When the board was last read (ISO time); none before the first time.
  read: string | null;
  builder: BuilderView;
  coach: CoachInCardsView;
};

export type State =
  | {
      mode: "setup";
      // The project being set up; its factory goes in its factory folder.
      project: string;
      kits: KitView[];
      jobs: Job[];
      coach: CoachView;
    }
  | {
      mode: "factory";
      // The project, and its factory folder in it.
      project: string;
      root: string;
      company: Company;
      products: ProductView[];
      parts: PartView[];
      settings: GroupView[];
      problems: string[];
      kits: KitView[];
      jobs: Job[];
      ideas: IdeaView[];
      // The connected board's cards, and who works them; none without a
      // connected board.
      work: WorkView | null;
      // The connected boards, by tracker add-on (board.json).
      board: Board;
      // Every add-on there is, on or off.
      addOns: AddOnView[];
      // Just set up: connecting where work is tracked comes first.
      onboarding: boolean;
    };

// A product to describe in the new factory: found in existing code, or new
// (made with its kit's starter in `folder`).
export type SetupProduct = {
  id: string;
  name: string;
  kind: string;
  folder: string;
  about: string;
  port?: number;
  commands?: Record<string, string>;
  isNew: boolean;
  users?: { who: string; does: string }[];
  dependsOn?: string[];
  // Its first blueprint, drafted from its code.
  blueprint?: string;
};

// The map the setup coach draws with the owner: how the project works, in
// small cards framed in areas and joined by arrows. It is only a picture to
// plan with; the coach writes the factory itself once the owner says so.
export type Draft = {
  cards: Card[];
  // Arrows from card to card (steps in order, who uses what).
  links: { id: string; from: string; to: string; label: string }[];
  // Where the owner put a card by hand; the others are arranged.
  places: Record<string, { x: number; y: number }>;
  // What the coach points the owner to: cards by id and areas by name. The
  // canvas moves there each time it is set (n counts the times).
  focus: { ids: string[]; areas: string[]; n: number };
  // The setup coach says the map holds what building the factory needs:
  // only then is the owner offered to build it.
  ready?: boolean;
};

// The icons a card or an item can show: everyday things, not technology.
export const ICONS = [
  "person",
  "people",
  "company",
  "shop",
  "home",
  "work",
  "truck",
  "car",
  "ship",
  "package",
  "cart",
  "fuel",
  "energy",
  "battery",
  "sun",
  "leaf",
  "water",
  "phone-app",
  "screen",
  "server",
  "data",
  "world",
  "languages",
  "place",
  "route",
  "calendar",
  "time",
  "payment",
  "money",
  "bill",
  "alert",
  "mail",
  "chat",
  "call",
  "safe",
  "private",
  "warning",
  "never",
  "done",
  "question",
  "see",
  "tool",
  "care",
  "health",
  "star",
  "goal",
  "try",
  "idea",
  "learn",
  "growth",
  "settings",
  "picture",
  "document",
] as const;
export type IconName = (typeof ICONS)[number];

// One card on the map: a short title, a line of text if needed, and an
// icon; or a picture from the project with its title as the caption; in an
// area if the coach gives it one. A rule (what must never happen) or a
// question (still open) is marked as one. A guess from the code is not
// confirmed until the owner agrees.
export type Card = {
  id: string;
  area?: string;
  title: string;
  text?: string;
  icon?: IconName;
  // A picture from the project, by its path inside it.
  picture?: string;
  tone?: "rule" | "question";
  confirmed: boolean;
};

export type CoachMessage = { from: "coach" | "owner"; text: string };

// The stages agreed work goes through, on the factory's board (and the
// connected board's columns, matched to them). An idea is a draft before.
// Planning: the plan of a piece of work is talked through with the owner in
// its conversation (for work that did not come through Ideas) until it is
// agreed; To do is the owner's go-ahead to build it.
export const STAGES = [
  "backlog",
  "planning",
  "todo",
  "doing",
  "review",
  "done",
] as const;
export type Stage = (typeof STAGES)[number];
export type StageMap = Record<Stage, string>;

// One of the factory's ideas: its conversation with the idea coach and its
// map, as the setup coach's (CoachView), and whether the plan is agreed.
export type IdeaView = CoachView & {
  id: string;
  title: string;
  // A draft until the owner agrees to its plan; then a stage on the board.
  status: "draft" | Stage;
  created: string;
  updated: string;
};

// The setup coach's conversation: what was said, the reply being written,
// what it is doing right now, and why it cannot answer, if it cannot.
export type CoachView = {
  messages: CoachMessage[];
  writing: string | null;
  activity: string | null;
  working: boolean;
  // A turn was asked for: the canvas is shown.
  started: boolean;
  problem: string | null;
  draft: Draft;
  // Planning on the map, or building the factory (the owner said so).
  phase: "plan" | "build";
  // The coach has written a factory that can be opened.
  made: boolean;
};

// The owner's own change to the map: a card taken off, or moved. What a
// card says is changed by talking to the coach.
export type ChangeDraft =
  { remove: string } | { move: { id: string; x: number; y: number } };

// The company the coach names, which makes the factory's folder.
export type CreateCompany = { name: string; about: string };

export type { GitHubStatus } from "./add-ons/github/github.ts";

export type AddOnView = {
  id: string;
  name: string;
  about: string;
  // Ships with the factory (on unless switched off).
  builtIn: boolean;
  on: boolean;
  // Tracks work: a board to connect.
  tracker: boolean;
  // Its settings groups, by id (shown while it is on).
  settings: string[];
};
export type { Board } from "./connect/board-file.ts";
