// A new test from what the page (or another extension) asked for: who,
// the name, the story and the days; or one thing to try (a prototype's
// test), which is a test of one day with that as its only situation.

import type {
  KobblePersona,
  PersonaTest,
  TestDay,
} from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../../refused.ts";
import { daySchema, who } from "./prompts.ts";

// What Mimic writes before a test: its title, the story, the days, the app
// and the persona's language and time zone.
export type TestDraft = {
  title: string;
  story: string;
  days: TestDay[];
  product: string | null;
  app: string | null;
  locale: string | null;
  timeZone: string | null;
};

const askedSchema = z.object({
  persona: z.string().min(1),
  title: z.string().trim().optional(),
  story: z.string().default(""),
  days: z.array(daySchema).optional(),
  task: z.string().trim().optional(),
  on: z.string().default("main"),
  product: z.string().min(1).nullable().default(null),
  locale: z.string().nullable().default(null),
  timeZone: z.string().nullable().default(null),
});

type Asked = z.infer<typeof askedSchema> & { days: TestDay[] };

// What was asked, read; refused when it says nothing about the days.
export function askedOf(body: unknown): Asked {
  const asked = askedSchema
    .catch({
      persona: "",
      story: "",
      on: "main",
      product: null,
      locale: null,
      timeZone: null,
    })
    .parse(body);
  const days = asked.task
    ? [{ title: "", situations: [asked.task] }]
    : (asked.days ?? []);
  if (asked.persona && days.length === 0)
    throw new Refused("Say what happens to the persona on their days.");
  return { ...asked, days };
}

// The test's record, waiting its turn.
export function newTest(
  id: string,
  asked: Asked,
  persona: KobblePersona,
): PersonaTest {
  return {
    id,
    persona: persona.id,
    title: asked.title || asked.task || `${persona.name}'s test`,
    story: asked.story || who(persona),
    days: asked.days,
    on: asked.on,
    product: asked.product,
    locale: asked.locale,
    timeZone: asked.timeZone,
    status: "queued",
    started: null,
    ended: null,
    steps: [],
    doing: null,
    signals: [],
    problem: null,
  };
}
