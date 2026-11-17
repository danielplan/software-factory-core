// Where Kobble keeps its records: one file per record in the product's
// repository, under <factory folder>/kobble/, meant to go into git so the
// team shares them like the code:
//
//   signals/S-0001.json
//   explorations/X-1/exploration.json
//   personas/<id>.json
//   tests/T-0001.json    persona tests
//   sync.json            when the live app was last read, and the cursor
//
// The files are JSON, not Markdown with front matter: the platform reads and
// writes JSON on its own, while front matter would need a YAML library. Each
// is pretty-printed with a newline at the end, so a change shows as a small
// diff. A write goes to a file beside it first and is then renamed into
// place, so a file is never left half-written.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { z } from "zod";

import { messageOf } from "../products/product.ts";
import {
  type Exploration,
  explorationSchema,
  type KobblePersona,
  kobblePersonaSchema,
  type KobbleSignal,
  kobbleSignalSchema,
  type PersonaTest,
  personaTestSchema,
  type SyncState,
  syncStateSchema,
} from "./schemas.ts";

export const KOBBLE_FOLDER = "kobble";

// A record that does not fit, or a file that cannot be read, with why.
export class KobbleRefused extends Error {}

type Kinds = {
  signals: KobbleSignal;
  explorations: Exploration;
  personas: KobblePersona;
  tests: PersonaTest;
};
export type KobbleKind = keyof Kinds;

const SCHEMAS: { [K in KobbleKind]: z.ZodType<Kinds[K]> } = {
  signals: kobbleSignalSchema,
  explorations: explorationSchema,
  personas: kobblePersonaSchema,
  tests: personaTestSchema,
};

// What one record is called in a sentence.
const NAMED: Record<KobbleKind, string> = {
  signals: "signal",
  explorations: "exploration",
  personas: "persona",
  tests: "test",
};

const SYNC_FILE = "sync.json";
const NEVER: SyncState = { last: null, cursor: null };

export class KobbleStore {
  readonly root: string;

  // root: the factory's folder in the product's repository.
  constructor(factory: string) {
    this.root = join(factory, KOBBLE_FOLDER);
  }

  // Every record of a kind, in the order of their ids; a file that does
  // not fit is refused, with its name and why.
  all<K extends KobbleKind>(kind: K): Kinds[K][] {
    const folder = join(this.root, kind);
    if (!existsSync(folder)) return [];
    return this.ids(kind).map((id) =>
      this.read(kind, id, this.fileOf(kind, id)),
    );
  }

  get<K extends KobbleKind>(kind: K, id: string): Kinds[K] | null {
    if (
      !z
        .string()
        .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/)
        .safeParse(id).success
    )
      return null;
    const file = this.fileOf(kind, id);
    return existsSync(file) ? this.read(kind, id, file) : null;
  }

  // Writes the record, refused with why when it does not fit.
  put<K extends KobbleKind>(kind: K, record: Kinds[K]): Kinds[K] {
    const parsed = SCHEMAS[kind].safeParse(record);
    if (!parsed.success)
      throw new KobbleRefused(
        `This ${NAMED[kind]} does not fit: ${z.prettifyError(parsed.error)}`,
      );
    const id = (parsed.data as { id: string }).id;
    writeAtomically(this.fileOf(kind, id), parsed.data);
    return parsed.data;
  }

  remove(kind: KobbleKind, id: string): void {
    if (!this.get(kind, id))
      throw new KobbleRefused(`There is no ${NAMED[kind]} “${id}”.`);
    rmSync(
      kind === "explorations"
        ? join(this.root, kind, id)
        : this.fileOf(kind, id),
      { recursive: true, force: true },
    );
  }

  // The next free id: S-0001, S-0002… for signals, T-0001… for tests,
  // X-1, X-2… for explorations.
  nextId(kind: "signals" | "explorations" | "tests"): string {
    const numbers = this.ids(kind).map((id) => Number(id.replace(/^\D+/, "")));
    const next = Math.max(0, ...numbers.filter(Number.isFinite)) + 1;
    if (kind === "explorations") return `X-${String(next)}`;
    return `${kind === "signals" ? "S" : "T"}-${String(next).padStart(4, "0")}`;
  }

  sync(): SyncState {
    const file = join(this.root, SYNC_FILE);
    if (!existsSync(file)) return NEVER;
    const parsed = syncStateSchema.safeParse(readJson(file, SYNC_FILE));
    if (!parsed.success)
      throw new KobbleRefused(
        `${SYNC_FILE} does not fit: ${z.prettifyError(parsed.error)}`,
      );
    return parsed.data;
  }

  saveSync(state: SyncState): void {
    writeAtomically(join(this.root, SYNC_FILE), syncStateSchema.parse(state));
  }

  private ids(kind: KobbleKind): string[] {
    const folder = join(this.root, kind);
    if (!existsSync(folder)) return [];
    const entries = readdirSync(folder, { withFileTypes: true });
    const ids =
      kind === "explorations"
        ? entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .filter((id) => existsSync(this.fileOf(kind, id)))
        : entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
            .map((entry) => entry.name.slice(0, -".json".length));
    return ids.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  }

  private fileOf(kind: KobbleKind, id: string): string {
    return kind === "explorations"
      ? join(this.root, kind, id, "exploration.json")
      : join(this.root, kind, `${id}.json`);
  }

  private read<K extends KobbleKind>(
    kind: K,
    id: string,
    file: string,
  ): Kinds[K] {
    const name = file.slice(this.root.length + 1);
    const parsed = SCHEMAS[kind].safeParse(readJson(file, name));
    if (!parsed.success)
      throw new KobbleRefused(
        `${name} does not fit: ${z.prettifyError(parsed.error)}`,
      );
    if ((parsed.data as { id: string }).id !== id)
      throw new KobbleRefused(`${name} has the id of another ${NAMED[kind]}.`);
    return parsed.data;
  }
}

function readJson(file: string, name: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new KobbleRefused(`${name} cannot be read: ${messageOf(error)}`);
  }
}

function writeAtomically(file: string, data: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${String(process.pid)}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(temporary, file);
}
