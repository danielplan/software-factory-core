// The factory's look in a company: `factory/theme.css`, which the dashboard
// loads after its own styles, so the company's variables win (colours,
// fonts, corners, shadows). It may name files from the project itself, such
// as its own fonts, by their path inside it:
// url("/api/theme/file?path=<path>"). Only a file the theme names, of a
// font or picture type, is given out.

import { existsSync, readFileSync, statSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { extname, isAbsolute, join, normalize, relative } from "node:path";

import { FACTORY_FOLDER } from "@software-factory/core";

import { PICTURE_TYPES } from "./coach/pictures.ts";

export const THEME_FILE = "theme.css";
export const THEME_FILE_ROUTE = "/api/theme/file";
// What the dashboard asks for: the theme itself, and the files it names.
export const THEME_ROUTES = new Set(["/theme.css", THEME_FILE_ROUTE]);

export const THEME_FILE_TYPES: Record<string, string> = {
  ...PICTURE_TYPES,
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

// The theme's text; none when the company has none (the factory's own look).
export function themeOf(project: string): string {
  const file = join(project, FACTORY_FOLDER, THEME_FILE);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

// The file a theme names, inside the project; none for anything else.
export function themeFile(project: string, path: string): string | null {
  const theme = themeOf(project);
  const named = `${THEME_FILE_ROUTE}?path=${path}`;
  if (!theme.includes(named) && !theme.includes(encodeURI(named))) return null;
  if (!THEME_FILE_TYPES[extname(path).toLowerCase()]) return null;
  const file = normalize(join(project, path));
  const inside = relative(project, file);
  if (!inside || inside.startsWith("..") || isAbsolute(inside)) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

// /theme.css (empty without a theme), or a file it names.
export function sendTheme(
  response: ServerResponse,
  project: string,
  url: URL,
): void {
  if (url.pathname !== THEME_FILE_ROUTE) {
    response.writeHead(200, {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(themeOf(project));
    return;
  }
  const path = url.searchParams.get("path");
  const file = path ? themeFile(project, path) : null;
  if (!file) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "The theme names no such file." }));
    return;
  }
  response.writeHead(200, {
    "content-type":
      THEME_FILE_TYPES[extname(file).toLowerCase()] ??
      "application/octet-stream",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(readFileSync(file));
}
