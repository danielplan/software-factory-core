// A team's own extensions: each in its own folder of the company's factory
// (factory/extensions/<id>/extension.json), written by the builder when the
// team asks Sprocket for something, and reviewed like any change before it
// reaches the main branch. Nothing is loaded without passing the checks
// below, and one extension that fails them never stops the others: it is
// left out and the factory says why, in plain words.
//
// An extension of the team is a description (a file), never code that runs
// by itself: it can bring a page, Home blocks, a kobold, a stage, a guide and
// settings, and it can need other extensions. It cannot start programs, be
// always needed, track work or take the place of one of Kobble's own pieces:
// those are for Kobble's extensions, so that nothing unknown runs.

import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";

import { z } from "zod";

import { readSettings } from "../parts/addresses.ts";
import type { SettingGroup } from "../settings/setting-groups.ts";
import { TEAM_FILE } from "../settings/team-file.ts";
import { extensionSchema, type Extension } from "./extension.ts";
import type { Available } from "./registry.ts";

// Where a team's extensions are, in the company's factory folder.
export const TEAM_EXTENSIONS_FOLDER = "extensions";

// The file that describes one extension, in its own folder.
export const TEAM_EXTENSION_FILE = "extension.json";

// What only Kobble's own extensions have.
const NOT_FOR_A_TEAM = ["core", "always", "tracker", "parts"] as const;

// The shape of a team's extension: Kobble's, with a typo refused instead of
// ignored and nothing that only Kobble's own have.
const teamExtensionSchema = extensionSchema.strict();

export const OWN_EXTENSIONS_KEY = "FACTORY_OWN_EXTENSIONS";

// The off switch: whether the factory loads the team's own extensions at
// all. On unless the team switches it off, for everyone (team.env).
export const ownExtensionsSettings: SettingGroup = {
  id: "own-extensions",
  name: "Your team's extensions",
  about:
    "Extensions your team asked for, kept in the factory's extensions folder. Off: none of them is loaded, and everything else works as before.",
  file: TEAM_FILE,
  usedBy: [],
  fields: [
    {
      key: OWN_EXTENSIONS_KEY,
      label: "Load your team's own extensions",
      help: "On (the standard): extensions in the factory's extensions folder are checked and offered in the Marketplace. Off: none is loaded.",
      kind: "choice",
      default: "on",
      choices: [
        { value: "off", label: "Off" },
        { value: "on", label: "On" },
      ],
    },
  ],
};

export function ownExtensionsOn(root: string): boolean {
  return readSettings(root, TEAM_FILE)[OWN_EXTENSIONS_KEY] !== "off";
}

// What an extension is given by another (a page, a Home block, a kobold)
// cannot be given twice: the page and Home would not know which is meant.
const SINGLE = ["pages", "blocks", "kobolds"] as const;

function insideFolder(folder: string, file: string): string | null {
  const path = resolve(folder, file);
  if (!existsSync(path)) return null;
  const real = realpathSync(path);
  return real.startsWith(realpathSync(folder) + sep) ? real : null;
}

// One folder's extension, checked: the extension, or why it is left out.
function readOne(
  parent: string,
  name: string,
  taken: Extension[],
): { extension: Extension } | { problem: string } {
  const folder = join(parent, name);
  const where = `The extension in ${TEAM_EXTENSIONS_FOLDER}/${name}`;
  const file = join(folder, TEAM_EXTENSION_FILE);
  if (!existsSync(file))
    return {
      problem: `${where} has no ${TEAM_EXTENSION_FILE}, so it is not loaded`,
    };
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {
      problem: `${where} has an ${TEAM_EXTENSION_FILE} that cannot be read, so it is not loaded`,
    };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data))
    return {
      problem: `${where} is not described as an extension, so it is not loaded`,
    };
  for (const key of NOT_FOR_A_TEAM)
    if (key in data)
      return {
        problem: `${where} says "${key}", which only Kobble's own extensions can: it is not loaded`,
      };
  const parsed = teamExtensionSchema.safeParse(data);
  if (!parsed.success)
    return {
      problem: `${where} is not right, so it is not loaded: ${z.prettifyError(parsed.error)}`,
    };
  const extension = parsed.data;
  if (extension.id !== name)
    return {
      problem: `${where} is called "${extension.id}" inside: the folder and the id must be the same, so it is not loaded`,
    };
  const clash = taken.find((other) => other.id === extension.id);
  if (clash)
    return {
      problem: `${where} has the id of ${clash.name}: ids are not shared, so it is not loaded`,
    };
  for (const kind of SINGLE) {
    const double = extension.brings[kind].find((one) =>
      taken.some((other) => other.brings[kind].includes(one)),
    );
    if (double)
      return {
        problem: `${where} brings "${double}", which another extension brings already: it is not loaded`,
      };
  }
  for (const group of extension.settings)
    if (
      group.file !== TEAM_FILE &&
      !/^settings\/[\w.-]+\.env$/.test(group.file)
    )
      return {
        problem: `${where} keeps settings in ${group.file}: only ${TEAM_FILE} and the settings folder are allowed, so it is not loaded`,
      };
  const guides = [];
  for (const guide of extension.guides) {
    const real = insideFolder(folder, guide.file);
    if (!real)
      return {
        problem: `${where} has a guide, ${guide.file}, that is not in its own folder: it is not loaded`,
      };
    guides.push({ ...guide, file: real });
  }
  return { extension: { ...extension, guides } };
}

// The team's extensions found in the factory folder, each checked: the ones
// that pass, and a plain line for each that does not. `taken` are the
// extensions that are there already (Kobble's own).
export function readTeamExtensions(
  root: string,
  taken: Extension[],
): { extensions: Extension[]; problems: string[] } {
  const parent = join(root, TEAM_EXTENSIONS_FOLDER);
  if (!existsSync(parent)) return { extensions: [], problems: [] };
  const extensions: Extension[] = [];
  const problems: string[] = [];
  const names = readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const name of names) {
    const read = readOne(parent, name, [...taken, ...extensions]);
    if ("problem" in read) problems.push(read.problem);
    else extensions.push(read.extension);
  }
  return { extensions, problems };
}

// What the factory knows about with the team's extensions added, unless the
// off switch is off; and what was wrong with any of them.
export function withTeamExtensions(
  root: string,
  available: Available,
): { available: Available; problems: string[] } {
  if (!ownExtensionsOn(root)) return { available, problems: [] };
  const { extensions, problems } = readTeamExtensions(
    root,
    available.extensions,
  );
  return {
    available: {
      ...available,
      extensions: [...available.extensions, ...extensions],
    },
    problems,
  };
}
