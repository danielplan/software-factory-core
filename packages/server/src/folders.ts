// The folders on this computer, for choosing one on the setup page: a
// browser cannot say where a folder is, so the page asks the server.

import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

import type { FolderList } from "./api.ts";

export function listFolders(asked: string | null): FolderList {
  const home = homedir();
  const path = resolve(asked?.trim() || home);
  let folders: string[];
  try {
    folders = readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .filter((name) => name !== "node_modules")
      .sort((a, b) => a.localeCompare(b));
  } catch {
    folders = [];
  }
  const parent = dirname(path);
  return { path, parent: parent === path ? null : parent, folders, home };
}
