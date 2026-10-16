// Pictures from the project on the setup canvas: an app's icon, a
// screenshot, a design the owner made. A card names one by its path inside
// the project; the page is given only a picture a card shows.

import { existsSync, statSync } from "node:fs";
import { extname, isAbsolute, join, normalize, relative, sep } from "node:path";

import type { Draft } from "../api.ts";
import { Refused } from "../refused.ts";

export const PICTURE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};
const LARGEST = 5 * 1024 * 1024;

// The picture's path inside the project, checked: a picture file there,
// not too large.
export function pictureIn(project: string, path: string): string {
  const file = normalize(isAbsolute(path) ? path : join(project, path));
  const inside = relative(project, file);
  if (!inside || inside.startsWith("..") || isAbsolute(inside))
    throw new Refused(`${path} is not inside the project.`);
  if (!PICTURE_TYPES[extname(file).toLowerCase()])
    throw new Refused(`${path} is not a picture (png, jpg, webp or gif).`);
  if (!existsSync(file) || !statSync(file).isFile())
    throw new Refused(`There is no picture ${path}.`);
  if (statSync(file).size > LARGEST)
    throw new Refused(`${path} is too large to show.`);
  return inside.split(sep).join("/");
}

// The file of a picture a card shows; none for any other path.
export function shownPicture(
  project: string,
  draft: Draft,
  path: string,
): string | null {
  const shown = draft.things.some(
    (t) => t.kind === "card" && t.picture === path,
  );
  return shown ? join(project, path) : null;
}
