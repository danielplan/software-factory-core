// What a person does with an exploration: start one that waits, make a new
// one for an idea of the team's, drop it, agree to a prototype (or take it
// back), and hand off the agreed prototype: handoff.md beside it and a
// GitHub issue on the connected board with the problem, the agreed
// prototype's branch and what was learned.

import {
  type Exploration,
  type KobbleStore,
  type PersonaTest,
  titleOf,
} from "@software-factory/core";
import { z } from "zod";

import type { Cards } from "../../cards/cards.ts";
import { Refused } from "../../refused.ts";

export function explorationOf(store: KobbleStore, id: string): Exploration {
  const exploration = store.get("explorations", id);
  if (!exploration) throw new Refused(`There is no exploration “${id}”.`);
  return exploration;
}

function open(store: KobbleStore, id: string): Exploration {
  const exploration = explorationOf(store, id);
  if (!["waiting", "exploring"].includes(exploration.status))
    throw new Refused(`${id} is ${exploration.status} already.`);
  return exploration;
}

// Start: a waiting exploration is explored now. True when it just started.
export function startExploration(store: KobbleStore, id: string): boolean {
  const exploration = open(store, id);
  if (exploration.status === "exploring") return false;
  store.put("explorations", { ...exploration, status: "exploring" });
  return true;
}

const newSchema = z.object({
  title: z.string().trim().min(1, "Say what to explore."),
  problem: z.string().trim().default(""),
  persona: z.string().optional(),
});

// New exploration: a team idea, no signal needed; it waits to be started.
export function newExploration(
  store: KobbleStore,
  body: unknown,
  now: Date = new Date(),
): Exploration {
  const parsed = newSchema.safeParse(body);
  if (!parsed.success)
    throw new Refused(parsed.error.issues.map((i) => i.message).join(" "));
  const { title, problem, persona } = parsed.data;
  if (persona && !store.get("personas", persona))
    throw new Refused(`There is no persona “${persona}”.`);
  return store.put("explorations", {
    id: store.nextId("explorations"),
    title: titleOf(title),
    status: "waiting",
    personas: persona ? [persona] : [],
    signals: [],
    problem: problem || title,
    created: now.toISOString(),
    work: null,
  });
}

export function dropExploration(store: KobbleStore, id: string): Exploration {
  return store.put("explorations", { ...open(store, id), status: "dropped" });
}

// Agree: this prototype is agreed, any other is a sketch again; agreeing
// to the agreed one takes it back.
export function agree(store: KobbleStore, id: string, key: string): void {
  open(store, id);
  const board = store.board(id);
  const made = board.prototypes.find((one) => one.key === key);
  if (!made) throw new Refused(`${id} has no prototype ${key}.`);
  const now = !made.agreed;
  store.saveBoard(id, {
    ...board,
    prototypes: board.prototypes.map((one) => ({
      ...one,
      agreed: one.key === key ? now : false,
    })),
  });
}

// Hand off: the agreed prototype becomes a GitHub issue on the connected
// board, its first column; handoff.md says the same.
export async function handOff(
  store: KobbleStore,
  id: string,
  cards: () => Cards,
): Promise<{ issue: number; url: string }> {
  const exploration = open(store, id);
  const board = store.board(id);
  const agreed = board.prototypes.find((one) => one.agreed);
  if (!agreed)
    throw new Refused("Agree to a prototype first: it is what is handed off.");
  const connected = cards();
  const tests = store
    .all("tests")
    .filter((test) => agreed.tests.includes(test.id));
  const text = handoffText(exploration, board, agreed, tests);
  const card = await connected.create(exploration.title, text);
  store.saveHandoff(
    id,
    `# ${exploration.title}\n\n${text}\n\nHanded off as #${String(card.number)}.\n`,
  );
  store.put("explorations", {
    ...exploration,
    status: "handed-off",
    work: card.number,
  });
  return { issue: card.number, url: card.url };
}

function handoffText(
  exploration: Exploration,
  board: ReturnType<KobbleStore["board"]>,
  agreed: ReturnType<KobbleStore["board"]>["prototypes"][number],
  tests: PersonaTest[],
): string {
  const learned = [
    ...board.notes.map((note) => `- ${note}`),
    ...tests.map((test) => {
      const fine = test.steps.filter((step) => step.asExpected).length;
      return `- Persona test ${test.id}: ${String(fine)} of ${String(test.steps.length)} steps as expected.`;
    }),
  ];
  return [
    `**The problem:** ${exploration.problem}`,
    "",
    `**The question:** ${board.question}`,
    "",
    `**Agreed:** ${agreed.key} · ${agreed.name}. ${agreed.difference}`,
    "",
    `**The prototype:** on the branch \`${agreed.branch}\`.`,
    ...(learned.length > 0 ? ["", "**What we learned:**", ...learned] : []),
    "",
    `<!-- factory:kobble exploration=${exploration.id} prototype=${agreed.key} -->`,
  ].join("\n");
}
