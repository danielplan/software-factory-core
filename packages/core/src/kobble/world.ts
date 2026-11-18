// The made-up world an exploration's prototypes share: a product's own
// tables as JSON rows, started from a situation (a file in the folder the
// product names as its "world" in product.json) and changed by the
// prototypes and by the kobold. Each change gets the next version; a change
// made on an older version is refused, so nothing is lost when two arrive at
// once. Pure on purpose, so the rules are covered by tests; where the world
// is kept is the store's (store.ts), where the situations are is
// situations.ts.

import { z } from "zod";

const row = z.record(z.string(), z.unknown());
const tables = z.record(z.string(), z.array(row));

// A situation as the product keeps it: <key>.json in its world folder.
export const situationSchema = z.strictObject({
  name: z.string().trim().min(1),
  about: z.string(),
  // The moment its times are written for.
  clock: z.iso.datetime({ offset: true }),
  // Who is signed in, by whatever the product calls its sign-ins (an app,
  // a role): the row id of each.
  signed_in: z.record(z.string(), z.string()),
  tables,
});

// The world as the prototypes see it, and as it is kept (world.json beside
// the exploration).
export const worldSchema = z.strictObject({
  situation: z.string().min(1),
  version: z.number().int().min(1),
  signed_in: z.record(z.string(), z.string()),
  tables,
});

// One change a prototype or the kobold makes: a row added, changed (by its
// id: only the columns given change) or removed (by its id, or by every
// column given when it has none).
export const worldChangeSchema = z.strictObject({
  table: z.string().min(1),
  op: z.enum(["add", "change", "remove"]),
  row,
});

export type Row = z.infer<typeof row>;
export type Situation = z.infer<typeof situationSchema>;
export type World = z.infer<typeof worldSchema>;
export type WorldChange = z.infer<typeof worldChangeSchema>;

// A change the world refuses, in plain words: made on an older version
// (stale), with no world to make it in (missing), or not one it takes.
export class WorldRefused extends Error {
  readonly why: "stale" | "missing" | "refused";
  constructor(message: string, why: WorldRefused["why"] = "refused") {
    super(message);
    this.why = why;
  }
}

const DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

// A situation started now: every time moved by as much as now is after its
// clock, so "in an hour" stays in an hour; dates by whole days.
export function startWorld(
  key: string,
  situation: Situation,
  now: Date,
): World {
  const shift = now.getTime() - Date.parse(situation.clock);
  return {
    situation: key,
    version: 1,
    signed_in: { ...situation.signed_in },
    tables: moved(situation.tables, shift) as World["tables"],
  };
}

function moved(value: unknown, shift: number): unknown {
  if (typeof value === "string") return movedTime(value, shift);
  if (Array.isArray(value)) return value.map((item) => moved(item, shift));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, moved(item, shift)]),
    );
  return value;
}

function movedTime(text: string, shift: number): string {
  if (DATE_TIME.test(text))
    return new Date(Date.parse(text) + shift).toISOString();
  if (DATE.test(text)) {
    const days = Math.round(shift / DAY_MS);
    return new Date(Date.parse(`${text}T00:00:00Z`) + days * DAY_MS)
      .toISOString()
      .slice(0, 10);
  }
  return text;
}

// The changes, made on the version seen (none: the version now), all or
// none.
export function changeWorld(
  world: World,
  seen: number | null,
  changes: WorldChange[],
): World {
  if (seen !== null && seen !== world.version)
    throw new WorldRefused(
      `The world changed meanwhile (it is at version ${String(world.version)}, not ${String(seen)}): read it again and redo the change.`,
      "stale",
    );
  const next = { ...world.tables };
  for (const change of changes) {
    const rows = next[change.table];
    if (!rows)
      throw new WorldRefused(
        `There is no table ${change.table}. The tables: ${Object.keys(world.tables).join(", ") || "none"}.`,
      );
    next[change.table] = changedRows(rows, change);
  }
  return { ...world, version: world.version + 1, tables: next };
}

function changedRows(rows: Row[], change: WorldChange): Row[] {
  const { table, op, row } = change;
  const found = rows.findIndex((one) => sameRow(one, row));
  if (op === "add") {
    if ("id" in row && found >= 0)
      throw new WorldRefused(
        `${table} has a row with the id ${idOf(row)} already.`,
      );
    return [...rows, row];
  }
  if (op === "change" && !("id" in row))
    throw new WorldRefused(`A row to change in ${table} needs its id.`);
  if (found < 0) {
    const which = "id" in row ? `with the id ${idOf(row)}` : "like that";
    throw new WorldRefused(`${table} has no row ${which}.`);
  }
  if (op === "remove") return rows.filter((one) => !sameRow(one, row));
  return rows.map((one, at) => (at === found ? { ...one, ...row } : one));
}

// The same row: the same id, or, without one, the same value in every
// column given.
function sameRow(one: Row, given: Row): boolean {
  if ("id" in given) return JSON.stringify(one.id) === JSON.stringify(given.id);
  return Object.entries(given).every(
    ([column, value]) => JSON.stringify(one[column]) === JSON.stringify(value),
  );
}

function idOf(row: Row): string {
  return JSON.stringify(row.id);
}

// The world in a few lines for the kobold: who is signed in, each table and
// how many rows it has.
export function worldText(world: World, situationName: string): string {
  const counts = Object.entries(world.tables)
    .filter(([, rows]) => rows.length > 0)
    .map(([name, rows]) => `${name} (${String(rows.length)})`);
  const empty = Object.entries(world.tables)
    .filter(([, rows]) => rows.length === 0)
    .map(([name]) => name);
  const signedIn = Object.entries(world.signed_in)
    .map(([who, id]) => `${who}: ${id}`)
    .join(", ");
  return [
    `The made-up world (version ${String(world.version)}), started from the situation “${situationName}”.`,
    `Signed in: ${signedIn || "nobody"}.`,
    `Tables with rows: ${counts.join(", ") || "none"}.`,
    `Empty tables: ${empty.join(", ") || "none"}.`,
  ].join("\n");
}
