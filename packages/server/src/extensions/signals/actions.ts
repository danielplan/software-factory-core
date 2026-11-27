// What a person does with a signal on the Signals page: Fix (a card on the
// connected board), Explore or Add to an exploration (Explorations' plug),
// Dismiss. Each answers with what it changed, or is refused with why.

import {
  type Exploration,
  type KobbleSignal,
  type KobbleStore,
  titleOf,
} from "@software-factory/core";

import { type Cards, withPlan } from "../../cards/cards.ts";
import type { IdeasPlug } from "../../plugs/ideas.ts";
import { Refused } from "../../refused.ts";

// A new signal, not handled yet.
export function fresh(store: KobbleStore, id: string): KobbleSignal {
  const signal = store.get("signals", id);
  if (!signal) throw new Refused(`There is no signal “${id}”.`);
  if (signal.status !== "new")
    throw new Refused(`Signal ${id} is handled already (${signal.status}).`);
  return signal;
}

// The signals a card is being made for now: a second Fix while GitHub is
// still making the first card is refused, so no card is made twice.
const fixing = new Set<string>();

// Fix: a GitHub issue on the connected board, in To do, with what the
// signal says and where it came from, and the plan the team agreed to (the
// card's agreed plan, so the builder does not plan again); the signal goes
// to it.
export async function fixSignal(
  store: KobbleStore,
  id: string,
  cards: () => Cards,
  plan: { title: string; text: string } | null = null,
): Promise<KobbleSignal> {
  const signal = fresh(store, id);
  if (fixing.has(id))
    throw new Refused(`A card for signal ${id} is being made already.`);
  fixing.add(id);
  try {
    const body = [
      signal.text,
      "",
      `From ${[signal.source === "app" ? "the app" : signal.source, signal.persona, signal.at.slice(0, 10)].filter(Boolean).join(", ")}.`,
      "",
      `<!-- factory:kobble signal=${signal.id} -->`,
    ].join("\n");
    const card = await cards().create(
      plan?.title ?? titleOf(signal.text),
      plan ? withPlan(body, plan.text) : body,
      "todo",
    );
    return store.put("signals", {
      ...fresh(store, id),
      status: "fixed",
      to: `#${String(card.number)}`,
    });
  } finally {
    fixing.delete(id);
  }
}

export function dismissSignal(store: KobbleStore, id: string): KobbleSignal {
  return store.put("signals", { ...fresh(store, id), status: "dismissed" });
}

// Explore: handed to Explorations as an idea it heard (its plug): added to
// the open exploration the check found for it, or a new exploration that
// waits to be started. Refused while Explorations is not installed.
export function exploreSignal(
  store: KobbleStore,
  id: string,
  ideas: IdeasPlug | null,
): { signal: KobbleSignal; exploration: Exploration } {
  const signal = fresh(store, id);
  if (!ideas)
    throw new Refused(
      "Explorations is not installed: install it in the Marketplace (#extensions) to explore a signal.",
    );
  const exploration = ideas.hear(signal);
  const explored = store.put("signals", {
    ...signal,
    status: "explored",
    to: exploration.id,
  });
  return { signal: explored, exploration };
}
