// Where a finding is, checked before it is kept: a file in the project
// (never outside it) and a line within that file, so a person who opens it
// lands on the code in question. Refused with why otherwise, so the kobold
// corrects itself.

import { readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { Refused } from "../refused.ts";

const EXAMPLE = "like shop/src/cart.ts:42";

// The file and line of a place written `file:line` or `file:line:column`.
export function placeOf(where: string): { file: string; line: number | null } {
  const parts = where.trim().split(":");
  const numbers: number[] = [];
  while (parts.length > 1 && /^\d+$/.test(parts.at(-1) ?? ""))
    numbers.unshift(Number(parts.pop()));
  return { file: parts.join(":").trim(), line: numbers[0] ?? null };
}

// Refused unless the place is a file in the project and a line in it.
export function checkPlace(project: string, where: string): void {
  const { file, line } = placeOf(where);
  const path = resolve(project, file);
  const inside = !relative(project, path).startsWith(`..${sep}`);
  if (!inside || !isFile(path))
    throw new Refused(
      `There is no file “${file}” in the project: say where it is from the project's root, ${EXAMPLE}.`,
    );
  if (line === null)
    throw new Refused(`Say the line too, after the file, ${EXAMPLE}.`);
  const lines = linesIn(path);
  if (line < 1 || line > lines)
    throw new Refused(
      `“${file}” has ${String(lines)} lines, so there is no line ${String(line)}: say the line the problem is on.`,
    );
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

// How many lines a file has; a last line ending the file is not one more.
function linesIn(path: string): number {
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n").length;
  return text.endsWith("\n") ? lines - 1 : lines;
}
