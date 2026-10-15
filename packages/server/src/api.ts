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
      // Where a new factory folder goes when nothing else is said.
      factoriesFolder: string;
      kits: KitView[];
      jobs: Job[];
      coach: CoachView;
    }
  | {
      mode: "factory";
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

// The company as the setup coach drafts it while the owner talks: shown as
// a map that builds up, and made into the factory when the owner says so.
// A new product's folder is empty until then (it goes in the factory's
// code folder).
export type Draft = {
  company: { name: string; about: string };
  products: (SetupProduct & {
    users: { who: string; does: string }[];
    dependsOn: string[];
  })[];
};

export type CoachMessage = { from: "coach" | "owner"; text: string };

// The setup coach's conversation: what was said, the reply being written,
// what it is doing right now, and why it cannot answer, if it cannot.
export type CoachView = {
  messages: CoachMessage[];
  writing: string | null;
  activity: string | null;
  working: boolean;
  problem: string | null;
  draft: Draft;
};

// The owner's own change to the draft: the company, one product, or a
// product taken off.
export type ChangeDraft =
  | { company: { name?: string; about?: string } }
  | { product: { id: string; name?: string; about?: string } }
  | { remove: string };

// Setting up as part of the dashboard, one step at a time: the company
// first (its factory folder), then products whenever, then the tracker.
export type CreateCompany = { name: string; about: string; folder?: string };

export type AddProducts = { products: SetupProduct[] };

export type ChooseTracker = {
  tracker: Company["tracker"];
  // The chosen tracker's settings (the GitHub board's, or Jira's).
  settings?: Record<string, string>;
};
