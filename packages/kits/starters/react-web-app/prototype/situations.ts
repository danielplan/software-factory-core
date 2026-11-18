import type { z } from "zod";
import type { itemsSchema } from "@/api/items.schema";

// What a situation hands the pretend backend: a GET /api/items answer as the
// app checks it (src/api/items.schema.ts), so a situation the app would
// refuse fails the typecheck.
export type Data = z.input<typeof itemsSchema>;

// The situations a prototype can open in, in the order the factory shows
// them; the first is the default. Add one by adding an entry: the tests open
// the app in each.
type Situation = { key: string; name: string; data: () => Data };

const dayMs = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * dayMs).toISOString();

// A few made-up items, their times moved to now.
export function normalDay(): Data {
  return {
    items: [
      {
        id: "item-1",
        name: "First item",
        note: "Made-up data, to show where the screens get their data.",
        updated_at: ago(0),
      },
      {
        id: "item-2",
        name: "Second item",
        note: "The pretend backend answers GET /api/items with it.",
        updated_at: ago(1),
      },
      {
        id: "item-3",
        name: "Third item",
        note: "Change prototype/situations.ts to change what it shows.",
        updated_at: ago(3),
      },
    ],
  };
}

const nothingYet = (): Data => ({ items: [] });

export const situations: Situation[] = [
  { key: "normal", name: "A normal day", data: normalDay },
  { key: "empty", name: "Empty", data: nothingYet },
];
