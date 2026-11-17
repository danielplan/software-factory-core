// Files a person attaches in the chat: a picture, a PDF or a text file. Each
// is kept in the factory's folder, in attachments/, which git ignores (the
// factory's .gitignore names it as soon as the first one comes), under a
// name the factory makes: the name it had is only a label, never part of a
// path. The kobold, which works in the project and may read there (never a
// settings file), reads a picture or a PDF with its Read tool; a text file
// comes in its prompt as it is.

import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { FACTORY_FOLDER } from "@software-factory/core";
import { z } from "zod";

import { parsed } from "../records/person.ts";
import { Refused } from "../refused.ts";

const FOLDER = "attachments";

// What can be attached, by its type, and the ending its file gets.
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/json": "json",
};
const TEXT = new Set(["txt", "md", "csv", "json"]);
// Under the server's limit for a request, the file sent as base64.
const MOST_BYTES = 7 * 1024 * 1024;
// How much of a text file goes in a prompt.
const MOST_TEXT = 20_000;
// The name the factory gives a file: nothing a person wrote.
const NAMED = new RegExp(
  `^[0-9a-f-]{36}\\.(${[...new Set(Object.values(TYPES))].join("|")})$`,
);

export type Attached = { id: string; name: string; type: string; size: number };

const attachSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  type: z.string(),
  data: z.string().min(1),
});

// The files a message comes with: what the factory named them, and their
// names as the person had them; five at most.
export const filesSchema = z
  .array(
    z.strictObject({
      id: z.string().regex(NAMED),
      name: z.string().trim().min(1).max(200),
    }),
  )
  .max(5)
  .default([]);

export function storeAttachment(project: string, body: unknown): Attached {
  const { name, type, data } = parsed(attachSchema, body, "file");
  const ending = TYPES[type];
  if (!ending)
    throw new Refused(
      "Only pictures, PDFs and text files can be attached here.",
    );
  const bytes = Buffer.from(data, "base64");
  if (bytes.length === 0) throw new Refused("That file is empty.");
  if (bytes.length > MOST_BYTES)
    throw new Refused("That file is larger than 7 MB.");
  const folder = join(project, FACTORY_FOLDER, FOLDER);
  mkdirSync(folder, { recursive: true });
  ignoreAttachments(join(project, FACTORY_FOLDER));
  const id = `${randomUUID()}.${ending}`;
  writeFileSync(join(folder, id), bytes);
  return { id, name, type, size: bytes.length };
}

// What a prompt says of the files a message came with: a text file as it
// is, a picture or a PDF as a path in the project to read with Read.
export function attachedLines(
  project: string,
  files: z.infer<typeof filesSchema>,
): string[] {
  if (files.length === 0) return [];
  const lines = ["", "They attached these files (read only these):"];
  for (const { id, name } of files) {
    const path = `${FACTORY_FOLDER}/${FOLDER}/${id}`;
    if (!existsSync(join(project, path)))
      throw new Refused(`The file “${name}” is not there any more.`);
    if (TEXT.has(id.split(".").pop() ?? ""))
      lines.push(
        `- “${name}”, as it is:`,
        "```",
        readFileSync(join(project, path), "utf8").slice(0, MOST_TEXT),
        "```",
      );
    else lines.push(`- “${name}”: read it with the Read tool at ${path}`);
  }
  return lines;
}

// The factory's .gitignore names the attachments' folder, once.
function ignoreAttachments(root: string): void {
  const file = join(root, ".gitignore");
  const lines = existsSync(file)
    ? readFileSync(file, "utf8").split(/\r?\n/)
    : [];
  if (lines.some((line) => line.trim() === `${FOLDER}/`)) return;
  const last = lines.at(-1);
  const gap = last === undefined || last === "" ? "" : "\n";
  appendFileSync(file, `${gap}${FOLDER}/\n`);
}
