// The check of a company's theme (theme.ts): with a theme, the colours the
// dashboard's text sits on are set for light and dark, as plain colours,
// text is readable on them (WCAG AA, 4.5:1), and every file it names is in
// the project. No theme is fine: the factory keeps its own look.

import { existsSync } from "node:fs";

import { parse as parseColour, wcagContrast } from "culori";
import postcss, { type AtRule, type Rule } from "postcss";

import { THEME_FILE_ROUTE, themeFile, themeOf } from "./theme.ts";

// The colours a theme sets, each with the text drawn on it.
const NEEDED = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--primary",
  "--primary-foreground",
  "--muted-foreground",
  "--border",
];
const READABLE: [text: string, on: string][] = [
  ["--foreground", "--background"],
  ["--card-foreground", "--card"],
  ["--muted-foreground", "--card"],
  ["--primary-foreground", "--primary"],
];
const AA = 4.5;

export function themeProblems(project: string): string[] {
  const theme = themeOf(project);
  if (!theme.trim()) return [];
  let root: postcss.Root;
  try {
    root = postcss.parse(theme);
  } catch (error) {
    return [`theme.css cannot be read: ${(error as Error).message}`];
  }
  return [
    ...colourProblems("light", variables(root, false)),
    ...colourProblems("dark", variables(root, true)),
    ...fileProblems(project, theme),
  ];
}

// The variables set on :root, outside or inside the dark theme's media rule.
function variables(root: postcss.Root, dark: boolean): Map<string, string> {
  const found = new Map<string, string>();
  root.walkRules((rule: Rule) => {
    if (!rule.selectors.some((s) => s.trim() === ":root")) return;
    if (inDark(rule) !== dark) return;
    rule.walkDecls(/^--/, (decl) => {
      found.set(decl.prop, decl.value.trim());
    });
  });
  return found;
}

function inDark(rule: Rule): boolean {
  let parent: postcss.Node | undefined = rule.parent;
  while (parent) {
    if (
      parent.type === "atrule" &&
      /prefers-color-scheme:\s*dark/.test((parent as AtRule).params)
    )
      return true;
    parent = parent.parent;
  }
  return false;
}

function colourProblems(mode: string, set: Map<string, string>): string[] {
  const problems: string[] = [];
  for (const name of NEEDED) {
    const value = set.get(name);
    if (value === undefined)
      problems.push(`theme.css sets no ${name} for the ${mode} theme.`);
    else if (!parseColour(value))
      problems.push(
        `theme.css: ${name} (${mode}) is "${value}", not a plain colour such as #3156d8.`,
      );
  }
  for (const [text, on] of READABLE) {
    const fore = parseColour(set.get(text) ?? "");
    const back = parseColour(set.get(on) ?? "");
    if (!fore || !back) continue;
    const ratio = wcagContrast(fore, back);
    if (ratio < AA)
      problems.push(
        `theme.css: ${text} on ${on} (${mode}) is hard to read: ${ratio.toFixed(1)}:1, needs ${String(AA)}:1.`,
      );
  }
  return problems;
}

// Every file the theme names, there and of a kind it may use.
function fileProblems(project: string, theme: string): string[] {
  const named = [
    ...theme.matchAll(/\/api\/theme\/file\?path=([^"')\s]+)/g),
  ].map((match) => decodeURI(match[1] ?? ""));
  return named.flatMap((path) => {
    const file = themeFile(project, path);
    return file && existsSync(file)
      ? []
      : [
          `theme.css names ${THEME_FILE_ROUTE}?path=${path}, which is not a font or picture inside the project.`,
        ];
  });
}
