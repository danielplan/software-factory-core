// Where Kobble keeps its records: one file per record in the product's
// repository, under <factory folder>/kobble/, meant to go into git so the
// team shares them like the code:
//
//   signals/S-0001.json
//   explorations/X-1/exploration.json
//   explorations/X-1/board.json         its canvas
//   explorations/X-1/conversation.md    the talk with the kobold
//   explorations/X-1/handoff.md         written when it is handed off
//   explorations/X-1/world.json         the made-up world its prototypes share
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
import { fromEarlier } from "./board-shape.ts";
import { ignoreSignals } from "./ignored.ts";
import {
  type Board,
  boardSchema,
  type Exploration,
  explorationSchema,
  type KobblePersona,
  kobblePersonaSchema,
  type Heard,
  type KobbleSignal,
  kobbleSignalSchema,
  type PersonaTest,
  personaTestSchema,
  type SyncState,
  syncStateSchema,
} from "./schemas.ts";
import { type World, worldSchema } from "./world.ts";

export const KOBBLE_FOLDER = "kobble";

// A record that does not fit, or a file that cannot be read, with why.
export class KobbleRefused extends Error {}

type Kinds = {
  signals: KobbleSignal;
  explorations: Exploration;
  personas: KobblePersona;
  tests: PersonaTest;
};
export type { Kinds as KobbleKinds };
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
const BOARD_FILE = "board.json";
const TALK_FILE = "conversation.md";
const WORLD_FILE = "world.json";
const EMPTY_BOARD: Board = { things: [], links: [] };

// The talk with the kobold about an exploration: Claude Code's conversation
// id, to go on with it, and what was said.
export type Conversation = {
  session: string | null;
  messages: { from: "kobold" | "you"; text: string }[];
};
const NEVER: SyncState = { last: null, cursor: null };

export class KobbleStore {
  readonly root: string;
  private readonly factory: string;

  // root: the factory's folder in the product's repository.
  constructor(factory: string) {
    this.factory = factory;
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
    // Signal files stay on this computer (ignored.ts).
    if (kind === "signals") ignoreSignals(this.factory);
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

  // An exploration's canvas; an empty one before anything is on it.
  board(id: string): Board {
    const file = join(this.root, "explorations", id, BOARD_FILE);
    if (!existsSync(file)) return EMPTY_BOARD;
    const name = `explorations/${id}/${BOARD_FILE}`;
    const data = readJson(file, name);
    // A board in the first shape is read as it is now (board-shape.ts).
    const parsed = boardSchema.safeParse(fromEarlier(data) ?? data);
    if (!parsed.success)
      throw new KobbleRefused(
        `${name} does not fit: ${z.prettifyError(parsed.error)}`,
      );
    return parsed.data;
  }

  saveBoard(id: string, board: Board): Board {
    this.explorationOrRefuse(id);
    const parsed = boardSchema.safeParse(board);
    if (!parsed.success)
      throw new KobbleRefused(
        `The board does not fit: ${z.prettifyError(parsed.error)}`,
      );
    writeAtomically(
      join(this.root, "explorations", id, BOARD_FILE),
      parsed.data,
    );
    return parsed.data;
  }

  // The made-up world an exploration's prototypes share; none before it
  // started.
  world(id: string): World | null {
    const file = join(this.root, "explorations", id, WORLD_FILE);
    if (!existsSync(file)) return null;
    const name = `explorations/${id}/${WORLD_FILE}`;
    const parsed = worldSchema.safeParse(readJson(file, name));
    if (!parsed.success)
      throw new KobbleRefused(
        `${name} does not fit: ${z.prettifyError(parsed.error)}`,
      );
    return parsed.data;
  }

  saveWorld(id: string, world: World): World {
    this.explorationOrRefuse(id);
    const saved = worldSchema.parse(world);
    writeAtomically(join(this.root, "explorations", id, WORLD_FILE), saved);
    return saved;
  }

  conversation(id: string): Conversation {
    const file = join(this.root, "explorations", id, TALK_FILE);
    return existsSync(file)
      ? talkFrom(readFileSync(file, "utf8"))
      : { session: null, messages: [] };
  }

  saveConversation(id: string, talk: Conversation): void {
    this.explorationOrRefuse(id);
    writeText(join(this.root, "explorations", id, TALK_FILE), talkText(talk));
  }

  // A picture a person put on the board, kept in the exploration's
  // pictures/ folder; its file's name.
  savePicture(id: string, name: string, bytes: Uint8Array): string {
    this.explorationOrRefuse(id);
    const file = join(this.root, "explorations", id, "pictures", name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    return name;
  }

  pictureFile(id: string, name: string): string | null {
    if (!/^[\w-]+\.(png|jpe?g|gif|webp)$/.test(name)) return null;
    const file = join(this.root, "explorations", id, "pictures", name);
    return existsSync(file) ? file : null;
  }

  // The hand-off note, written once it is handed off.
  saveHandoff(id: string, text: string): void {
    this.explorationOrRefuse(id);
    writeText(join(this.root, "explorations", id, "handoff.md"), text);
  }

  // An exploration written before it kept what it heard: its copy, from
  // the signal files on this computer.
  private withHeard(data: unknown): unknown {
    if (typeof data !== "object" || data === null || "heard" in data)
      return data;
    const ids = (data as { signals?: unknown }).signals;
    const heard = (Array.isArray(ids) ? ids : []).flatMap((id) => {
      const signal = typeof id === "string" ? this.get("signals", id) : null;
      return signal ? [heardOf(signal)] : [];
    });
    return { ...data, heard };
  }

  private explorationOrRefuse(id: string): void {
    if (!this.get("explorations", id))
      throw new KobbleRefused(`There is no exploration “${id}”.`);
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
    const data = readJson(file, name);
    const parsed = SCHEMAS[kind].safeParse(
      kind === "explorations" ? this.withHeard(data) : data,
    );
    if (!parsed.success)
      throw new KobbleRefused(
        `${name} does not fit: ${z.prettifyError(parsed.error)}`,
      );
    if ((parsed.data as { id: string }).id !== id)
      throw new KobbleRefused(`${name} has the id of another ${NAMED[kind]}.`);
    return parsed.data;
  }
}

// A signal as an exploration keeps it.
export function heardOf(signal: KobbleSignal): Heard {
  const { id, type, source, persona, at, text } = signal;
  return { id, type, source, persona, at, text };
}

function readJson(file: string, name: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new KobbleRefused(`${name} cannot be read: ${messageOf(error)}`);
  }
}

function writeAtomically(file: string, data: unknown): void {
  writeText(file, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${String(process.pid)}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, file);
}

// conversation.md: the conversation's id in a comment, then each message
// after who said it, in bold.
const SESSION = /^<!-- conversation: ([\w-]+) -->$/m;
const WHO = { kobold: "**Kobold:**", you: "**You:**" } as const;

function talkText(talk: Conversation): string {
  const head = talk.session ? [`<!-- conversation: ${talk.session} -->`] : [];
  const said = talk.messages.map((m) => `${WHO[m.from]} ${m.text.trim()}`);
  return `${[...head, ...said].join("\n\n")}\n`;
}

function talkFrom(text: string): Conversation {
  const messages: Conversation["messages"] = [];
  for (const line of text.split("\n")) {
    const from =
      (["kobold", "you"] as const).find((who) => line.startsWith(WHO[who])) ??
      null;
    const last = messages.at(-1);
    if (from)
      messages.push({ from, text: line.slice(WHO[from].length).trim() });
    else if (last && !SESSION.test(line)) last.text += `\n${line}`;
  }
  return {
    session: SESSION.exec(text)?.[1] ?? null,
    messages: messages.map((m) => ({ ...m, text: m.text.trim() })),
  };
}
