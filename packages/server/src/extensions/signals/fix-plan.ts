// Before Fix makes a card: the builder takes a quick, read-only look at the
// code and says back what it would do (guide fix-plan.md), so the team can
// agree or correct it. The plan goes into the card as its agreed plan, so
// the builder does not plan again. Nothing is kept until the card is made.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Claude, KobbleSignal, PersonaTest } from "@software-factory/core";
import { guidesFolder } from "@software-factory/skills";
import { z } from "zod";

import { Refused } from "../../refused.ts";

const TIME_LIMIT_MS = 4 * 60_000;

export const fixPlanSchema = z.object({
  title: z.string().trim().min(1).max(120),
  happens: z.string().trim().min(1),
  cause: z.string().trim().min(1),
  change: z.array(z.string().trim().min(1)).min(1).max(6),
  check: z.string().trim().min(1),
});

export type FixPlan = z.infer<typeof fixPlanSchema>;

// What the page sends with Fix (the plan agreed to) and with a correction
// (the plan before, and what to change in it); each left out is none.
export const fixAskedSchema = z.object({
  plan: fixPlanSchema.nullable().catch(null).default(null),
  before: fixPlanSchema.nullable().catch(null).default(null),
  correction: z.string().trim().min(1).nullable().catch(null).default(null),
});

// Where a test found it: what the persona did, expected and said there.
function momentOf(signal: KobbleSignal, test: PersonaTest | null): string {
  const step = signal.step;
  if (!step) return "";
  const moment = test?.steps[step.number - 1];
  return [
    `Where it happened (test ${step.test}, moment ${String(step.number)}):`,
    `- They did: ${step.did}`,
    ...(moment
      ? [
          `- They expected: ${moment.expected}`,
          ...(moment.note ? [`- They said: ${moment.note}`] : []),
        ]
      : []),
  ].join("\n");
}

export async function planFix(
  options: { claude: Claude; project: string },
  asked: {
    signal: KobbleSignal;
    test: PersonaTest | null;
    before?: FixPlan | null;
    correction?: string | null;
  },
): Promise<FixPlan> {
  const { signal, test, before, correction } = asked;
  const prompt = [
    `The signal (${signal.type}, from ${signal.source}):\n${signal.text}`,
    momentOf(signal, test),
    before && correction
      ? `Your plan before:\n${JSON.stringify(before, null, 2)}\n\nThe team's correction:\n${correction}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const result = await options.claude.run({
    cwd: options.project,
    prompt,
    readOnly: true,
    tools: ["Read", "Grep", "Glob"],
    deny: ["Read(**/.env*)"],
    instructions: readFileSync(join(guidesFolder, "fix-plan.md"), "utf8"),
    session: { id: randomUUID(), resume: false },
    timeLimitMs: TIME_LIMIT_MS,
    onActivity: () => {},
  });
  if (!result.ok)
    throw new Refused(
      `The builder could not look at it: ${result.error ?? "no reason given"}.`,
    );
  const said = result.text;
  try {
    return fixPlanSchema.parse(
      JSON.parse(said.slice(said.indexOf("{"), said.lastIndexOf("}") + 1)),
    );
  } catch {
    throw new Refused("The builder's plan could not be read. Try again.");
  }
}

// The plan as the card's agreed plan.
export function planText(plan: FixPlan): string {
  return [
    "### What happens",
    plan.happens,
    "",
    "### Likely cause",
    plan.cause,
    "",
    "### What to change",
    ...plan.change.map((one) => `- ${one}`),
    "",
    "### How we'll know",
    plan.check,
  ].join("\n");
}
