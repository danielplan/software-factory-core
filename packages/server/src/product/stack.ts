// What the factory sees of the project it works on: the folder, its git
// branch and where it is shared (a remote, without any password in it),
// and what each product is built with, read from its own files (its
// package.json's packages, and a few files that say a language or a
// tool). Nothing is run but git, and nothing is changed.

import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";

import { run } from "@software-factory/core";

export type StackGroup = { group: string; items: string[] };

// Known packages, by what they are for. Only what a person would
// recognise; anything else is left out.
const PACKAGES: [name: string | RegExp, group: string, shown: string][] = [
  ["react", "Interface", "React"],
  ["next", "Interface", "Next.js"],
  ["vue", "Interface", "Vue"],
  ["svelte", "Interface", "Svelte"],
  ["@sveltejs/kit", "Interface", "SvelteKit"],
  ["expo", "Interface", "Expo"],
  ["react-native", "Interface", "React Native"],
  ["@angular/core", "Interface", "Angular"],
  ["@nestjs/core", "Server", "NestJS"],
  ["express", "Server", "Express"],
  ["fastify", "Server", "Fastify"],
  ["hono", "Server", "Hono"],
  ["@prisma/client", "Data", "Prisma"],
  ["prisma", "Data", "Prisma"],
  ["drizzle-orm", "Data", "Drizzle"],
  ["typeorm", "Data", "TypeORM"],
  ["pg", "Data", "PostgreSQL"],
  ["mysql2", "Data", "MySQL"],
  ["mongoose", "Data", "MongoDB"],
  ["better-sqlite3", "Data", "SQLite"],
  [/^(redis|ioredis)$/, "Data", "Redis"],
  ["@supabase/supabase-js", "Data", "Supabase"],
  ["firebase", "Data", "Firebase"],
  ["tailwindcss", "Look", "Tailwind CSS"],
  ["vitest", "Checks", "Vitest"],
  ["jest", "Checks", "Jest"],
  ["@playwright/test", "Checks", "Playwright"],
  ["cypress", "Checks", "Cypress"],
  ["vite", "Tools", "Vite"],
  ["webpack", "Tools", "Webpack"],
  ["@nestjs/cli", "Tools", "Nest CLI"],
];

// Files that say a language or a tool, wherever there is no package.json
// to say it.
const FILES: [file: string, group: string, shown: string][] = [
  ["tsconfig.json", "Language", "TypeScript"],
  ["pyproject.toml", "Language", "Python"],
  ["requirements.txt", "Language", "Python"],
  ["go.mod", "Language", "Go"],
  ["Cargo.toml", "Language", "Rust"],
  ["Gemfile", "Language", "Ruby"],
  ["Dockerfile", "Tools", "Docker"],
];

const ORDER = [
  "Language",
  "Interface",
  "Server",
  "Data",
  "Look",
  "Checks",
  "Tools",
];

// What the product in this folder is built with, in groups.
export function stackOf(folder: string): StackGroup[] {
  const found = new Map<string, Set<string>>();
  const add = (group: string, shown: string) => {
    found.set(group, (found.get(group) ?? new Set()).add(shown));
  };
  const names = packagesIn(folder);
  for (const [name, group, shown] of PACKAGES)
    if (
      names.some((one) =>
        typeof name === "string" ? one === name : name.test(one),
      )
    )
      add(group, shown);
  for (const [file, group, shown] of FILES)
    if (existsSync(join(folder, file))) add(group, shown);
  if (names.includes("typescript")) add("Language", "TypeScript");
  if (names.length > 0 && !found.has("Language")) add("Language", "JavaScript");
  return ORDER.filter((group) => found.has(group)).map((group) => ({
    group,
    items: [...(found.get(group) ?? [])],
  }));
}

// The packages a package.json names, its own and those for building.
function packagesIn(folder: string): string[] {
  const file = join(folder, "package.json");
  if (!existsSync(file)) return [];
  try {
    const json = JSON.parse(readFileSync(file, "utf8")) as Record<
      string,
      unknown
    >;
    return ["dependencies", "devDependencies"].flatMap((key) => {
      const named = json[key];
      return named && typeof named === "object" ? Object.keys(named) : [];
    });
  } catch {
    return [];
  }
}

export type ProjectView = {
  name: string;
  folder: string;
  // The git branch it is on, and where it is shared; null where git says
  // nothing (not a repository, no remote).
  branch: string | null;
  remote: string | null;
};

export async function projectView(project: string): Promise<ProjectView> {
  return {
    name: basename(project),
    folder: project,
    branch: await git(project, "rev-parse", "--abbrev-ref", "HEAD"),
    remote: remoteWords(await git(project, "remote", "get-url", "origin")),
  };
}

// A product's folder, from the project's when it is not absolute.
export function folderIn(project: string, folder: string): string {
  return isAbsolute(folder) ? folder : join(project, folder);
}

async function git(folder: string, ...args: string[]): Promise<string | null> {
  try {
    const out = (await run("git", ["-C", folder, ...args])).trim();
    return out === "" ? null : out;
  } catch {
    return null;
  }
}

// Where a remote is, as a person reads it ("github.com/acme/shop"), never
// with a user name or password that may be written in it.
export function remoteWords(remote: string | null): string | null {
  if (!remote) return null;
  if (/^[a-z][\w+.-]*:\/\//i.test(remote)) {
    try {
      const url = new URL(remote);
      return url.host
        ? `${url.host}${url.pathname.replace(/\.git$/, "")}`
        : null;
    } catch {
      return null;
    }
  }
  // The scp form, [someone@]host:path: only what follows the last "@".
  const scp = /^(?:.*@)?([\w.-]+):(.+?)(?:\.git)?$/.exec(remote);
  return scp ? `${scp[1] ?? ""}/${scp[2] ?? ""}` : null;
}
