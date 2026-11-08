// The knowledge-base rules that no standard tool checks, inside every folder
// named `context/` (a company's knowledge base, or the template):
// - every page sits in a Diátaxis folder, and its "**Type:**" line matches
//   the folder and says which question the page answers ("Answers:");
// - decision records are MADR: NNNN-title.md, front matter, the three headings;
// - every page is linked from another Markdown file (no orphans);
// - pages and blueprints say what is true now: no "run NNN" headings.

import { dirname, posix } from "node:path";

import type { Problem } from "./problem.ts";

const KINDS: Record<string, string> = {
  tutorials: "Tutorial",
  "how-to": "How-to",
  reference: "Reference",
  explanation: "Explanation",
};
const SECTIONS = new Set([...Object.keys(KINDS), "decisions", "sources"]);
const MADR_HEADINGS = [
  "## Context and Problem Statement",
  "## Considered Options",
  "## Decision Outcome",
];
const DECISION_FIELDS = ["status", "date", "decision-makers"];
const TYPE_START = "**Type:** ";
const OUTSIDE =
  "Page outside the Diátaxis sections (use tutorials/, how-to/, reference/, explanation/ or decisions/)";

// The knowledge base a page belongs to ("context" or "company/context"), and
// its path inside it; null when the page is not in one.
export function placeInContext(
  file: string,
): { base: string; inside: string } | null {
  const parts = file.split("/");
  const at = parts.indexOf("context");
  if (at < 0 || at === parts.length - 1) return null;
  return {
    base: parts.slice(0, at + 1).join("/"),
    inside: parts.slice(at + 1).join("/"),
  };
}

function decisionProblems(name: string, text: string): string[] {
  const problems: string[] = [];
  if (!/^\d{4}-[a-z0-9-]+\.md$/.test(name))
    problems.push("Decision not named NNNN-title.md");
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  for (const field of DECISION_FIELDS)
    if (!front || !new RegExp(`^${field}: .+`, "m").test(front))
      problems.push(`Decision without "${field}:" front matter`);
  for (const heading of MADR_HEADINGS)
    if (!text.includes(`\n${heading}\n`))
      problems.push(`Decision without "${heading}"`);
  return problems;
}

function typeProblems(section: string, isIndex: boolean, text: string) {
  const expected = isIndex ? "Index" : (KINDS[section] ?? "");
  const line = text
    .split("\n")
    .find((each) => each.startsWith(TYPE_START))
    ?.slice(TYPE_START.length);
  if (line === undefined)
    return [`Page without a "**Type:** ${expected}" line`];
  const kind = /^[A-Za-z-]+/.exec(line)?.[0] ?? "";
  if (kind !== expected)
    return [
      `Page in ${section}/ says "**Type:** ${kind}", expected "${expected}"`,
    ];
  if (!/ · Answers: \S/.test(line.slice(kind.length)))
    return ['Type line without "· Answers: <question>"'];
  return [];
}

// What is wrong with one page of a knowledge base, by its path inside it.
export function pageProblems(inside: string, text: string): string[] {
  const [section = ""] = inside.split("/");
  const name = posix.basename(inside);
  const nested = inside.includes("/");
  if (!nested)
    return inside === "index.md" ? typeProblems("", true, text) : [OUTSIDE];
  if (!SECTIONS.has(section)) return [OUTSIDE];
  if (section === "sources") return [];
  const isIndex = name === "index.md";
  if (section === "decisions" && !isIndex) return decisionProblems(name, text);
  return typeProblems(section, isIndex, text);
}

// The Markdown files each page links to (local links only).
function linkedFiles(pages: Map<string, string>): Set<string> {
  const linked = new Set<string>();
  for (const [file, text] of pages)
    for (const match of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]+)?\)/g)) {
      const target = match[1] ?? "";
      if (/^[a-z]+:/i.test(target) || target.startsWith("/")) continue;
      const resolved = posix.normalize(posix.join(dirname(file), target));
      if (resolved !== file) linked.add(resolved);
    }
  return linked;
}

// A heading that tells a run's story ("## Orders, run 042").
const isRunHeading = (line: string): boolean =>
  /^#{1,6} /.test(line) && /\brun \d{3}\b/i.test(line);

function runHeadings(file: string, text: string): Problem[] {
  return text
    .split("\n")
    .filter(isRunHeading)
    .map((heading) => ({
      file,
      message: `Run-diary heading: "${heading.trim()}" (link the run instead)`,
    }));
}

// pages: every Markdown file under the root checked, with its text.
export function checkRules(pages: Map<string, string>): Problem[] {
  const problems: Problem[] = [];
  const linked = linkedFiles(pages);
  for (const [file, text] of pages) {
    const place = placeInContext(file);
    if (posix.basename(file) === "BLUEPRINT.md")
      problems.push(...runHeadings(file, text));
    if (!place) continue;
    for (const message of pageProblems(place.inside, text))
      problems.push({ file, message });
    if (place.inside.startsWith("sources/")) continue;
    problems.push(...runHeadings(file, text));
    if (place.inside !== "index.md" && !linked.has(file))
      problems.push({
        file,
        message: "Orphan page: no other page links to it",
      });
  }
  return problems;
}
