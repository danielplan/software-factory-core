// What a person does with a signal on the Signals page (Fix, Explore or Add
// to an exploration, Dismiss), and a new persona. Each answers with what it
// changed, or is refused with why.

import {
  type Exploration,
  faceFor,
  PERSONA_COLORS,
  PERSONA_HATS,
  type KobblePersona,
  type KobbleSignal,
  type KobbleStore,
  titleOf,
} from "@software-factory/core";
import { z } from "zod";

import type { Cards } from "../cards/cards.ts";
import { Refused } from "../refused.ts";

// A new signal, not handled yet.
function fresh(store: KobbleStore, id: string): KobbleSignal {
  const signal = store.get("signals", id);
  if (!signal) throw new Refused(`There is no signal “${id}”.`);
  if (signal.status !== "new")
    throw new Refused(`Signal ${id} is handled already (${signal.status}).`);
  return signal;
}

// Fix: a GitHub issue on the connected board, in To do, with what the
// signal says and where it came from; the signal goes to it.
export async function fixSignal(
  store: KobbleStore,
  id: string,
  cards: () => Cards,
): Promise<KobbleSignal> {
  const signal = fresh(store, id);
  const board = cards();
  const card = await board.create(
    titleOf(signal.text),
    [
      signal.text,
      "",
      `From ${[signal.source === "app" ? "the app" : signal.source, signal.persona, signal.at.slice(0, 10)].filter(Boolean).join(", ")}.`,
      "",
      `<!-- factory:kobble signal=${signal.id} -->`,
    ].join("\n"),
  );
  await board.move(card.number, "todo");
  return store.put("signals", {
    ...fresh(store, id),
    status: "fixed",
    to: `#${String(card.number)}`,
  });
}

export function dismissSignal(store: KobbleStore, id: string): KobbleSignal {
  return store.put("signals", { ...fresh(store, id), status: "dismissed" });
}

// Explore: added to the open exploration the check found for it, or a new
// exploration that waits to be started.
export function exploreSignal(
  store: KobbleStore,
  id: string,
  now: Date = new Date(),
): { signal: KobbleSignal; exploration: Exploration } {
  const signal = fresh(store, id);
  const found =
    signal.already?.kind === "exploration"
      ? store.get("explorations", signal.already.id)
      : null;
  const open =
    found && ["waiting", "exploring"].includes(found.status) ? found : null;
  const personas = signal.persona ? [signal.persona] : [];
  const exploration = store.put(
    "explorations",
    open
      ? {
          ...open,
          signals: [...open.signals, signal.id],
          personas: [...new Set([...open.personas, ...personas])],
        }
      : {
          id: store.nextId("explorations"),
          title: titleOf(signal.text),
          status: "waiting",
          personas,
          signals: [signal.id],
          problem: signal.text,
          created: now.toISOString(),
          work: null,
        },
  );
  const explored = store.put("signals", {
    ...signal,
    status: "explored",
    to: exploration.id,
  });
  return { signal: explored, exploration };
}

const newPersonaSchema = z.object({
  name: z.string().trim().min(1, "Say the persona's name."),
  place: z.string().trim().default(""),
  about: z.string().trim().default(""),
  // The face picked in the dialog; worked out from the id when not given.
  face: z
    .object({ hat: z.enum(PERSONA_HATS), color: z.enum(PERSONA_COLORS) })
    .optional(),
});

// A persona a person on the team adds, with an id made from the name.
export function addPersona(store: KobbleStore, body: unknown): KobblePersona {
  const parsed = newPersonaSchema.safeParse(body);
  if (!parsed.success)
    throw new Refused(parsed.error.issues.map((i) => i.message).join(" "));
  const { name, place, about, face } = parsed.data;
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .join("-") || "persona";
  let id = base;
  let n = 1;
  while (store.get("personas", id)) {
    n += 1;
    id = `${base}-${String(n)}`;
  }
  return store.put("personas", {
    id,
    name,
    place,
    about,
    origin: "developer",
    customers: [],
    face: face ?? faceFor(id),
  });
}
