// What a page or a Home block of an extension shows, with the lists that are
// kept in files read now. A file that cannot be read shows as an empty list
// (the extension's checks refuse a file that is wrong before the factory
// loads it, so this is only a file changed since).

import { readFileSync } from "node:fs";

import { z } from "zod";

import type { View, ViewItem } from "./extension.ts";

const itemsSchema = z.array(
  z.object({
    title: z.string().min(1),
    about: z.string().optional(),
    tag: z.string().optional(),
  }),
);

// The items in a list's file, or why it cannot be used.
export function readItems(
  file: string,
): { items: ViewItem[] } | { problem: string } {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { problem: "cannot be read as JSON" };
  }
  const parsed = itemsSchema.safeParse(data);
  return parsed.success
    ? { items: parsed.data }
    : { problem: "is not a list of items with a title" };
}

export type ShownPart =
  | { show: "text"; title?: string; text: string }
  | { show: "list"; title?: string; items: ViewItem[]; empty?: string };

export type ShownView = Omit<View, "parts"> & { parts: ShownPart[] };

// The view with its lists filled: the items written in it, then the file's.
export function shownView(view: View): ShownView {
  return {
    ...view,
    parts: view.parts.map((part): ShownPart => {
      if (part.show === "text") return part;
      const kept = part.from ? readItems(part.from) : null;
      return {
        show: "list",
        ...(part.title === undefined ? {} : { title: part.title }),
        ...(part.empty === undefined ? {} : { empty: part.empty }),
        items: [...part.items, ...(kept && "items" in kept ? kept.items : [])],
      };
    }),
  };
}
