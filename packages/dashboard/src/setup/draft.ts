// What the owner has said so far in the setup flow, and the defaults the
// page proposes from it.

import {
  type Company,
  idFrom,
  type SetupProduct,
  withoutEndSlashes,
} from "@/api";

export type Door = "new" | "existing";

export type Draft = {
  door: Door;
  name: string;
  about: string;
  // The factory's folder as the owner wrote it; empty: the default.
  folder: string;
  products: SetupProduct[];
  tracker: Company["tracker"];
  settings: Record<string, string>;
};

export const emptyDraft = (door: Door): Draft => ({
  door,
  name: "",
  about: "",
  folder: "",
  products: [],
  tracker: "none",
  settings: {},
});

// A path inside a folder, written the way that folder is.
export function inside(folder: string, ...names: string[]): string {
  const separator = folder.includes("\\") && !folder.includes("/") ? "\\" : "/";
  return [withoutEndSlashes(folder), ...names].join(separator);
}

export function factoryFolder(draft: Draft, factoriesFolder: string): string {
  return (
    draft.folder.trim() ||
    inside(factoriesFolder, idFrom(draft.name || "my-company"))
  );
}

// The kits' usual ports, for a new product.
const PORTS: Record<string, number> = {
  "react-web-app": 5173,
  "nestjs-backend": 3000,
  "expo-app": 8081,
};

// The kind's usual port, moved up past the ports other products have.
export function freePort(kind: string, products: SetupProduct[]): number {
  const taken = new Set(products.map((p) => p.port));
  let port = PORTS[kind] ?? 4000;
  while (taken.has(port)) port += 1;
  return port;
}

// An id from the name that no other product has.
export function freeId(name: string, products: SetupProduct[]): string {
  const base = idFrom(name);
  const taken = new Set(products.map((p) => p.id));
  let n = 1;
  while (taken.has(n === 1 ? base : `${base}-${String(n)}`)) n += 1;
  return n === 1 ? base : `${base}-${String(n)}`;
}

export const TRACKER_NAMES: Record<Company["tracker"], string> = {
  none: "Not yet",
  github: "GitHub board",
  jira: "Jira Cloud",
};
