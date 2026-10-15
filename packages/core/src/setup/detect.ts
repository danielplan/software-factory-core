// Recognises the products in a folder of existing code (brownfield): every
// folder, a few levels down, that one of the kits recognises as its kind of
// product. Nothing in the code is changed; what is found is proposed, and the
// owner confirms it.

import { readdirSync } from "node:fs";
import { basename, join } from "node:path";

import type { Detected, Kit } from "../extensions/extension.ts";

// A product found in existing code, as proposed to the owner.
export type Candidate = Detected & {
  id: string;
  kind: string;
  kit: string;
  folder: string;
};

const SKIPPED = new Set(["node_modules", ".git", "dist", "build", "coverage"]);
const DEPTH = 3;

// The products found under `folder`, each with a free id and port. A
// folder a kit recognises is not looked into further (a product's own
// subfolders are part of it).
export function detectProducts(folder: string, kits: Kit[]): Candidate[] {
  const found: Candidate[] = [];
  const look = (path: string, depth: number): void => {
    const kit = kits.find((k) => k.detect(path) !== null);
    const detected = kit?.detect(path);
    if (kit && detected) {
      found.push({
        ...detected,
        id: idFrom(basename(path)),
        kind: kit.kind,
        kit: kit.id,
        folder: path,
        ...((detected.port ?? kit.port)
          ? { port: detected.port ?? kit.port }
          : {}),
      });
      return;
    }
    if (depth >= DEPTH) return;
    for (const entry of folders(path)) look(join(path, entry), depth + 1);
  };
  look(folder, 0);
  return withFreePorts(withFreeIds(found));
}

function folders(path: string): string[] {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !SKIPPED.has(entry.name) &&
          !entry.name.startsWith("."),
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

// "My Shop_App" → "my-shop-app"; "app" when nothing is left.
export function idFrom(name: string): string {
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  let id = words.join("-");
  // An id starts with a letter.
  while (id !== "" && !/[a-z]/.test(id.charAt(0))) id = id.slice(1);
  return id || "app";
}

// Two products found in folders with the same name get "-2", "-3".
function withFreeIds(found: Candidate[]): Candidate[] {
  const taken = new Set<string>();
  return found.map((candidate) => {
    let id = candidate.id;
    let n = 1;
    while (taken.has(id)) {
      n += 1;
      id = `${candidate.id}-${String(n)}`;
    }
    taken.add(id);
    return { ...candidate, id };
  });
}

// Two products that would answer on the same port: the later one moves up.
export function withFreePorts<T extends { port?: number }>(found: T[]): T[] {
  const taken = new Set<number>();
  return found.map((candidate) => {
    if (candidate.port === undefined) return candidate;
    let port = candidate.port;
    while (taken.has(port)) port += 1;
    taken.add(port);
    return { ...candidate, port };
  });
}
