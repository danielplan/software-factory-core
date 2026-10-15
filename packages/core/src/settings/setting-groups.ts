// Settings groups: each a topic (the GitHub board, the AI models), the .env
// file it is saved in and the parts that read it, with its fields. Extensions
// add their groups; the Settings tab shows them and saves a change. Node reads
// .env files (util.parseEnv) but has nothing that changes one and keeps its
// comments, so the file is changed line by line here: every other line stays
// as it was.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { z } from "zod";

import { readSettings } from "../parts/addresses.ts";

export const settingFieldSchema = z.object({
  key: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "capitals, digits and _"),
  label: z.string().min(1),
  help: z.string().min(1),
  kind: z.enum(["text", "number", "choice"]),
  // What the program uses when its file does not set the value.
  default: z.string().optional(),
  // text: the value must match this.
  pattern: z.string().optional(),
  // number: whole numbers from min to max.
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  // choice: the values to pick from ("" can be one of them).
  choices: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
});

export const settingGroupSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  // What the group is for, in a sentence.
  about: z.string().min(1),
  // The .env file it is saved in, from the company's root.
  file: z.string().min(1),
  // The parts that read it when they start (one file can serve several).
  usedBy: z.array(z.string()),
  fields: z.array(settingFieldSchema).min(1),
});

export type SettingField = z.infer<typeof settingFieldSchema>;
export type SettingGroup = z.infer<typeof settingGroupSchema>;

// value: what the file says, or null when it does not set it (the default).
export type SettingView = SettingField & { value: string | null };

export type GroupView = Omit<SettingGroup, "fields"> & {
  fields: SettingView[];
};

// null for a value means: take it out of the file, so the default counts.
export type Changes = Record<string, string | null>;

export function groupView(group: SettingGroup, root: string): GroupView {
  const values = readSettings(root, group.file);
  return {
    ...group,
    fields: group.fields.map((field) => ({
      ...field,
      value: values[field.key] ?? null,
    })),
  };
}

// What is wrong with the groups, in plain words: unknown parts, a group or
// a setting listed twice, a choice with nothing to choose.
export function checkGroups(groups: SettingGroup[], parts: string[]): string[] {
  const keys = groups.flatMap((group) => group.fields.map((f) => f.key));
  const ids = groups.map((group) => group.id);
  return groups.flatMap((group, index) => [
    ...(ids.indexOf(group.id) === index
      ? []
      : [`the settings "${group.id}" are listed twice`]),
    ...group.usedBy
      .filter((id) => !parts.includes(id))
      .map(
        (id) =>
          `settings "${group.id}" are used by "${id}", which is not a part`,
      ),
    ...group.fields.flatMap((field) => {
      const problems: string[] = [];
      if (keys.indexOf(field.key) !== keys.lastIndexOf(field.key))
        problems.push(`the setting "${field.key}" is listed twice`);
      if (field.kind === "choice" && !field.choices?.length)
        problems.push(`"${group.id}" has nothing to choose for "${field.key}"`);
      return problems;
    }),
  ]);
}

// The changes as they will be saved ("" for a text or a number means the
// default), and plain words for each value that does not fit its field.
export function checkChanges(
  group: SettingGroup,
  asked: Record<string, unknown>,
): { changes: Changes; refused: Record<string, string> } {
  const changes: Changes = {};
  const refused: Record<string, string> = {};
  for (const [key, value] of Object.entries(asked)) {
    const field = group.fields.find((f) => f.key === key);
    const problem = field ? valueProblem(field, value) : "Not a setting here.";
    if (problem) refused[key] = problem;
    else if (field) changes[key] = normal(field, value as string | null);
  }
  return { changes, refused };
}

export function saveGroup(
  group: SettingGroup,
  root: string,
  changes: Changes,
): void {
  const path = join(root, group.file);
  const before = existsSync(path) ? readFileSync(path, "utf8") : "";
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, changeEnvText(before, changes));
}

// The .env text with these keys changed, added at the end, or taken out.
export function changeEnvText(text: string, changes: Changes): string {
  const end = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text === "" ? [] : text.replace(/\r?\n$/, "").split(/\r?\n/);
  const seen = new Set<string>();
  const kept = lines.flatMap((line) => {
    const key = /^\s*(?:export\s+)?(\w+)\s*=/.exec(line)?.[1];
    if (key === undefined || !(key in changes)) return [line];
    if (seen.has(key)) return [];
    seen.add(key);
    const value = changes[key];
    return value === null || value === undefined ? [] : [`${key}=${value}`];
  });
  for (const [key, value] of Object.entries(changes))
    if (!seen.has(key) && value !== null) kept.push(`${key}=${value}`);
  return kept.length === 0 ? "" : kept.join(end) + end;
}

function normal(field: SettingField, value: string | null): string | null {
  return field.kind !== "choice" && value === "" ? null : value;
}

function valueProblem(field: SettingField, value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") return "Write it as text.";
  if (field.kind === "choice")
    return field.choices?.some((choice) => choice.value === value)
      ? null
      : "Pick one of the choices.";
  if (value === "") return null;
  if (/["'#\s]/.test(value)) return "Use no spaces, quotes or #.";
  if (field.kind === "number") return numberProblem(field, value);
  return field.pattern && !new RegExp(field.pattern).test(value)
    ? "This does not look right; see the example in grey."
    : null;
}

function numberProblem(field: SettingField, value: string): string | null {
  const number = Number(value);
  const min = field.min ?? 0;
  const max = field.max ?? Number.MAX_SAFE_INTEGER;
  return /^\d+$/.test(value) && number >= min && number <= max
    ? null
    : `Write a whole number from ${String(min)} to ${String(max)}.`;
}
