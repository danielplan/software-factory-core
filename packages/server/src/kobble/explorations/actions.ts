// What a person does with an exploration: start one that waits, make a new
// one for an idea of the team's, drop it, agree to a prototype (or take it
// back), and hand off the agreed prototype: handoff.md beside it and a
// GitHub issue on the connected board with the problem, the agreed
// prototype's branch and what was learned.

import {
  type Board,
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
  // A Backlog issue of the board it starts from.
  issue: z.number().int().positive().optional(),
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
  const { title, problem, persona, issue } = parsed.data;
  if (persona && !store.get("personas", persona))
    throw new Refused(`There is no persona “${persona}”.`);
  const taken = issue
    ? store.all("explorations").find((one) => one.issue === issue)
    : undefined;
  if (taken)
    throw new Refused(`#${String(issue)} is explored already, in ${taken.id}.`);
  return store.put("explorations", {
    id: store.nextId("explorations"),
    title: titleOf(title),
    status: "waiting",
    personas: persona ? [persona] : [],
    signals: [],
    heard: [],
    problem: problem || title,
    created: now.toISOString(),
    work: null,
    ...(issue ? { issue } : {}),
  });
}

// A fresh exploration, opened at once on its canvas: the team says its idea
// to the kobold there, who names it. One the team opened and left without
// a word is opened again instead of making another.
export function freshExploration(
  store: KobbleStore,
  now: Date = new Date(),
): Exploration {
  const untouched = store
    .all("explorations")
    .find(
      (one) =>
        one.status === "exploring" &&
        !one.problem &&
        one.signals.length === 0 &&
        !one.issue &&
        store.conversation(one.id).messages.length === 0,
    );
  if (untouched) return untouched;
  return store.put("explorations", {
    id: store.nextId("explorations"),
    title: NEW_TITLE,
    status: "exploring",
    personas: [],
    signals: [],
    heard: [],
    problem: "",
    created: now.toISOString(),
    work: null,
  });
}

export const NEW_TITLE = "New idea";

export function dropExploration(store: KobbleStore, id: string): Exploration {
  return store.put("explorations", { ...open(store, id), status: "dropped" });
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
  const agreed = board.things.find(
    (one): one is Made => one.kind === "prototype" && one.agreed,
  );
  if (!agreed)
    throw new Refused("Agree to a prototype first: it is what is handed off.");
  const connected = cards();
  const tests = store
    .all("tests")
    .filter((test) => agreed.tests.includes(test.id));
  const text = handoffText(exploration, board, agreed, tests);
  // Handed off agreed: straight to To do, the go-ahead to build it. An
  // exploration of a Backlog issue fills in that issue instead.
  const card = await handedOffCard(connected, exploration, text);
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

type Made = Extract<Board["things"][number], { kind: "prototype" }>;

async function handedOffCard(
  cards: Cards,
  exploration: Exploration,
  text: string,
): Promise<{ number: number; url: string }> {
  if (!exploration.issue) return cards.create(exploration.title, text, "todo");
  await cards.writePlan(exploration.issue, text);
  await cards.move(exploration.issue, "todo");
  const { url } = await cards.show(exploration.issue);
  return { number: exploration.issue, url };
}

// What the team asked to change on the prototype along the way, in order:
// all of it is on its branch, and all of it is to be built.
function changeLines(agreed: Made): string[] {
  const changes = agreed.changes ?? [];
  if (changes.length === 0) return [];
  return [
    "",
    "**Changed along the way** (all of it is on the prototype's branch, and all of it is to be built):",
    ...changes.map((one, at) => `${String(at + 1)}. ${one}`),
  ];
}

// The agreed variant, when the prototype has several: build only that one.
function variantLines(agreed: Made): string[] {
  const variants = agreed.variants ?? [];
  const chosen = variants.find((one) => one.key === agreed.variant);
  if (variants.length < 2 || !chosen) return [];
  return [
    "",
    `**Variant:** ${chosen.key} · ${chosen.name}. ${chosen.difference}`,
    "",
    `The prototype holds the variants ${variants.map((one) => one.key).join(", ")}, shown by the page address (\`?variant=${chosen.key}\`). Build only ${chosen.key}: leave out the others and the variant switch.`,
  ];
}

function handoffText(
  exploration: Exploration,
  board: Board,
  agreed: Made,
  tests: PersonaTest[],
): string {
  const question = board.things.find(
    (one) =>
      one.kind === "choice" && one.options.some((o) => o.key === agreed.key),
  );
  const learned = [
    ...board.things.flatMap((one) =>
      one.kind === "note" ? [`- ${one.text}`] : [],
    ),
    ...board.things.flatMap((one) =>
      one.agreed && (one.kind === "diagram" || one.kind === "picture")
        ? [`- Agreed ${one.kind}: ${one.title}`]
        : [],
    ),
    ...tests.map((test) => {
      const fine = test.steps.filter((step) => step.asExpected).length;
      return `- Persona test ${test.id}: ${String(fine)} of ${String(test.steps.length)} steps as expected.`;
    }),
  ];
  return [
    `**The problem:** ${exploration.problem}`,
    "",
    `**The question:** ${question?.kind === "choice" ? question.title : "—"}`,
    "",
    `**Agreed:** ${agreed.key} · ${agreed.name}. ${agreed.difference}`,
    ...variantLines(agreed),
    ...changeLines(agreed),
    "",
    `**The prototype:** on the branch \`${agreed.branch}\`.`,
    ...(learned.length > 0 ? ["", "**What we learned:**", ...learned] : []),
    "",
    `<!-- factory:kobble exploration=${exploration.id} prototype=${agreed.key} -->`,
  ].join("\n");
}
