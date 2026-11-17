// What went wrong with a piece of the product, in plain words and in the
// dashboard's language: the problems the factory knows by heart (an address
// another program uses) are said again in the chosen language; any folder
// written out in full goes into the technical details, out of sight, and
// the words say "another folder" instead. Anything else is shown as the
// server wrote it. Kept apart from the components so it is checked on its
// own.

import type { PartView } from "../api.ts";
import { t } from "../i18n/i18n.ts";

export type Problem = NonNullable<PartView["problem"]>;

const ADDRESS = "Address ";
const ELSEWHERE = " is used by a program from another folder";
const TAKEN = " is used by another program";
const NEEDS = " needs it";

export function plainProblem(problem: Problem): Problem {
  const { words, folders } = withoutFolders(problem.text);
  const known = knownOf(problem.title, words) ?? {
    title: problem.title,
    text: words,
  };
  return { ...known, details: [...folders, ...problem.details] };
}

// A problem the factory knows by heart, in the dashboard's language.
function knownOf(
  title: string,
  words: string,
): { title: string; text: string } | null {
  const name = words.includes(NEEDS) ? words.split(NEEDS)[0] : undefined;
  if (name === undefined) return null;
  const elsewhere = portIn(title, ELSEWHERE);
  if (elsewhere)
    return {
      title: t("product:problem.elsewhere", { port: elsewhere }),
      text: t("product:problem.elsewhereText", { name }),
    };
  const taken = portIn(title, TAKEN);
  if (taken)
    return {
      title: t("product:problem.taken", { port: taken }),
      text: t("product:problem.takenText", { name }),
    };
  return null;
}

// The port in "Address 3001 is used by …", when the title is that one.
function portIn(title: string, end: string): string | null {
  if (!title.startsWith(ADDRESS) || !title.endsWith(end)) return null;
  const port = title.slice(ADDRESS.length, title.length - end.length);
  return /^\d+$/.test(port) ? port : null;
}

// The text with every folder written out in full (from the root, the home
// folder or a drive) said as "another folder", and those folders apart.
export function withoutFolders(text: string): {
  words: string;
  folders: string[];
} {
  const folders: string[] = [];
  const words = text
    .split(" ")
    .map((token) => {
      const start = token.startsWith("(") ? 1 : 0;
      let end = token.length;
      while (end > start && ",.;:)".includes(token.charAt(end - 1))) end -= 1;
      const inner = token.slice(start, end);
      if (!isFolder(inner)) return token;
      folders.push(inner);
      return `${token.slice(0, start)}${t("product:problem.aFolder")}${token.slice(end)}`;
    })
    .join(" ");
  return { words, folders };
}

function isFolder(token: string): boolean {
  const separators = token.split(/[/\\]/).length - 1;
  const rooted =
    token.startsWith("/") ||
    token.startsWith("~/") ||
    (token.charAt(1) === ":" && token.charAt(2) === "\\");
  return rooted && separators >= 2;
}
