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
};

export type FinishSetup = {
  company: { name: string; about: string; tracker: Company["tracker"] };
  // The factory folder; when empty, a new one in the factories folder.
  folder?: string;
  products: SetupProduct[];
  // The tracker's settings (the GitHub board's, or Jira's).
  settings?: Record<string, string>;
};
