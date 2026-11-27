// What Mimic is asked in each part of a test, and how its answers are read:
// the story and the days (Part 0), one day lived as the persona (Part 1),
// and the analyst's signals (Part 2). The method is the persona-test skill.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  KobblePersona,
  PersonaTest,
  TestDay,
  TestStep,
} from "@software-factory/core";
import { skillsFolder } from "@software-factory/skills";
import { z } from "zod";

import { type App, TestProblem } from "../../kobble/browser.ts";
import type { NewSignal } from "../../plugs/signals.ts";
import { Refused } from "../../refused.ts";
import type { TestDraft } from "./new-test.ts";

export const daySchema = z.object({
  title: z.string(),
  situations: z.array(z.string().trim().min(1)).min(1),
});

const draftSchema = z.object({
  app: z.string().nullable().optional(),
  title: z.string().trim().min(1),
  story: z.string().trim().min(1),
  locale: z.string().nullable().optional(),
  timeZone: z.string().nullable().optional(),
  days: z.array(daySchema).min(1),
});

export const diarySchema = z.object({
  // The persona could not go on, as the person would (no way in, nothing
  // works): the days after this one are not lived.
  stuck: z.boolean().optional(),
  steps: z.array(
    z.object({
      time: z.string().nullable().optional(),
      did: z.string().min(1),
      expected: z.string().min(1),
      asExpected: z.boolean(),
      note: z.string().optional(),
      shot: z.string().nullable().optional(),
    }),
  ),
});

const findingsSchema = z.object({
  signals: z.array(
    z.object({
      type: z.enum(["bug", "idea", "question"]),
      text: z.string().trim().min(1),
      // The diary's moment it happened at, from 1 over all the days.
      step: z.number().int().nullable().optional(),
    }),
  ),
});

// The line the persona agent writes before each moment: "Step 3: …".
const STEP_LINE = /^Step (\d+):(.*)$/gm;

const lines = (items: string[]) => items.map((one) => `- ${one}`).join("\n");

// Part 0: who the persona is, the apps there are and their tests before.
export function draftPrompt(
  persona: KobblePersona,
  apps: App[],
  before: string[],
): string {
  const listed = apps.map((app) => `${app.id}: ${app.name}, ${app.does}`);
  return [
    "Part 0: write the story and the days.",
    who(persona),
    apps.length > 0 ? `The apps:\n${lines(listed)}` : "There is one app.",
    before.length > 0
      ? `Their tests before:\n${lines(before)}`
      : "This is their first test.",
  ].join("\n\n");
}

// Part 1: one day, with the story, what happens in it, what they did on
// the days before, and where the app runs.
export function dayPrompt(today: {
  test: PersonaTest;
  persona: KobblePersona;
  app: string;
  number: number;
  day: TestDay;
  before: TestStep[];
}): string {
  const { test, persona, app, number, day, before } = today;
  const name = `d${String(number)}`;
  const kind = day.title ? `: ${day.title}` : "";
  const done = before.map((step) => `Day ${String(step.day)}: ${step.did}`);
  return [
    "Part 1: live the day as the persona.",
    who(persona),
    `Your story:\n${test.story}`,
    `Day ${String(number)} of ${String(test.days.length)}${kind}. What happens:\n${lines(day.situations)}`,
    before.length > 0
      ? `What you did on the days before:\n${lines(done)}`
      : "This is your first day with the app.",
    `The app runs at ${app}. Open it in the browser. After every step, call browser_take_screenshot with filename ${name}-<step>.png (${name}-1.png, ${name}-2.png …) and put that name in the step's shot.`,
  ].join("\n\n");
}

// Part 2: the diary of all the days, its moments numbered from 1.
export function analystPrompt(
  test: PersonaTest,
  persona: KobblePersona,
  steps: TestStep[],
): string {
  const errors = (test.errors ?? []).map(
    (error) => `Day ${String(error.day)}: ${error.text}`,
  );
  return [
    "Part 2: the analyst.",
    who(persona),
    `Their story:\n${test.story}`,
    `The diary, its moments numbered from 1 over all the days:\n${JSON.stringify({ steps }, null, 2)}`,
    errors.length > 0
      ? `What the browser reported as errors meanwhile:\n${lines(errors)}`
      : "The browser reported no errors.",
  ].join("\n\n");
}

// Mimic's story and days, with the app it chose (the first when it named
// none there is).
export function draftOf(said: string, apps: App[]): TestDraft {
  const draft = answerOf(said, draftSchema, "story", Refused);
  const app = apps.find((one) => one.id === draft.app) ?? apps[0];
  return {
    title: draft.title,
    story: draft.story,
    days: draft.days,
    product: app?.id ?? null,
    app: app?.name ?? null,
    locale: draft.locale ?? null,
    timeZone: draft.timeZone ?? null,
  };
}

// The analyst's signals, each at its moment when the diary has it.
export function findingsOf(
  said: string,
  of: {
    test: PersonaTest;
    persona: KobblePersona;
    steps: TestStep[];
    at: string;
  },
): NewSignal[] {
  const { signals } = answerOf(said, findingsSchema, "signals");
  return signals.map((signal) => {
    const step = signal.step ? of.steps[signal.step - 1] : undefined;
    return {
      type: signal.type,
      source: "test" as const,
      sourceId: null,
      customer: null,
      persona: of.persona.id,
      at: of.at,
      text: signal.text,
      status: "new" as const,
      ...(step && signal.step
        ? { step: { test: of.test.id, number: signal.step, did: step.did } }
        : {}),
      to: null,
    };
  });
}

// The persona-test skill, as the agents read it.
export function personaTestSkill(): string {
  return readFileSync(join(skillsFolder, "persona-test", "SKILL.md"), "utf8");
}

// The last "Step N: …" line written so far, as "Step N: …", or null.
export function stepNow(text: string): string | null {
  const lines = [...text.matchAll(STEP_LINE)];
  const last = lines.at(-1);
  return last ? `Step ${last[1] ?? ""}: ${(last[2] ?? "").trim()}` : null;
}

export function who(persona: KobblePersona): string {
  return [
    `You are ${persona.name}`,
    persona.place && `(${persona.place})`,
    persona.about && `: ${persona.about}`,
  ]
    .filter(Boolean)
    .join(" ");
}

// The JSON at the end of an answer, checked; when it does not fit, the
// problem says so (a TestProblem while a test runs, Refused for a draft).
export function answerOf<T>(
  said: string,
  schema: z.ZodType<T>,
  what: string,
  Problem: new (message: string) => Error = TestProblem,
): T {
  const start = said.indexOf("{");
  const end = said.lastIndexOf("}");
  try {
    return schema.parse(JSON.parse(said.slice(start, end + 1)));
  } catch {
    throw new Problem(`The kobold's ${what} could not be read.`);
  }
}
