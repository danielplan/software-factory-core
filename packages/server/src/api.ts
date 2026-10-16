// What the server and the web interface say to each other: the state the
// page shows, and the requests its buttons send. The web interface imports
// these types only.

import type { Candidate, Company, GroupView } from "@software-factory/core";
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
    };

// A folder on this computer and the folders in it, for choosing one.
export type FolderList = {
  path: string;
  parent: string | null;
  folders: string[];
  home: string;
};

export type DetectAnswer = { candidates: Candidate[] };

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

// The project as the setup coach drafts it: the code tells it the
// products, so what it builds with the owner is the context around them,
// shown on a canvas and written into the knowledge base when the factory
// is made. The products are confirmed in the conversation, not drawn; a new
// product's folder is empty until the factory is made (it goes in the
// project). Each thing is a sketch until the owner agrees to it
// (`settled`).
export type Draft = {
  company: { name: string; about: string; settled: boolean };
  products: (SetupProduct & {
    users: { who: string; does: string }[];
    dependsOn: string[];
    settled: boolean;
  })[];
  // The context around the products, as cards in areas, and what the
  // coach proposes to install.
  things: Thing[];
  // Arrows from card to card (steps in order, what leads to what).
  links: { id: string; from: string; to: string; label: string }[];
  // What the coach points the owner to: cards by id and areas by name. The
  // canvas moves there each time it is set (n counts the times).
  focus: { ids: string[]; areas: string[]; n: number };
  // Where the owner put a thing by hand; the others are arranged.
  places: Record<string, { x: number; y: number }>;
};

// A card the coach writes on the canvas: a title and short items, in an
// area it chooses. An item is a term and what it means, or a line on its
// own; a guess from the code is not confirmed until the owner agrees.
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

// A card the coach writes on the canvas, in an area it chooses: a short
// title, a line of text if needed, and an icon; or a picture from the
// project with its title as the caption. A rule (what must never happen)
// or a question (still open) is marked as one, beside what it is about. A
// guess from the code is not confirmed until the owner agrees.
export type Thing =
  | {
      id: string;
      kind: "card";
      area: string;
      title: string;
      text?: string;
      icon?: IconName;
      // A picture from the project, by its path inside it.
      picture?: string;
      tone?: "rule" | "question";
      confirmed: boolean;
    }
  | {
      id: string;
      kind: "install";
      // What is installed: an id from the installables (installables.ts).
      what: string;
      name: string;
      about: string;
      why: string;
      // The owner's answer; installed with the factory when approved.
      answer: "asked" | "approved" | "declined";
    };

export type CoachMessage = { from: "coach" | "owner"; text: string };

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
};

// The owner's own change to the canvas: a thing taken off, moved, or an
// install answered. What a thing says is changed by talking to the coach.
export type ChangeDraft =
  | { remove: string }
  | { move: { id: string; x: number; y: number } }
  | { install: { id: string; answer: "approved" | "declined" } };

// Setting up as part of the dashboard, one step at a time: the company
// first (its factory folder), then products whenever, then the tracker.
export type CreateCompany = { name: string; about: string };

export type AddProducts = { products: SetupProduct[] };

export type ChooseTracker = {
  tracker: Company["tracker"];
  // The chosen tracker's settings (the GitHub board's, or Jira's).
  settings?: Record<string, string>;
};
