// What the Testing pages read: the tests and the personas there are (GET
// /api/kobble/testing), Mimic's story for a new test (GET
// /api/kobble/testing/draft?persona=), one test (GET
// /api/kobble/testing/test?id=) and a test once it is started (POST
// /api/kobble/testing).

import { z } from "zod";

import {
  kobblePersonaSchema,
  TEST_STATUSES,
  testDaySchema,
  testStepSchema,
} from "../../../../core/src/kobble/schemas.ts";
import type { TestDraft as ServedDraft } from "../../../../server/src/extensions/testing/new-test.ts";
import type {
  TestPage as ServedPage,
  TestPersona as ServedPersona,
  TestRow as ServedRow,
  testsView,
} from "../../../../server/src/extensions/testing/views.ts";
import { faceSchema } from "./faces.ts";
import { signalRowSchema } from "./signals.ts";

const testPersonaSchema = z.object({
  id: kobblePersonaSchema.shape.id,
  name: z.string(),
  place: z.string(),
  about: z.string(),
  face: faceSchema,
}) satisfies z.ZodType<ServedPersona>;

const testRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  persona: testPersonaSchema.nullable(),
  status: z.enum(TEST_STATUSES),
  on: z.string(),
  started: z.string().nullable(),
  ended: z.string().nullable(),
  doing: z.string().nullable(),
  problem: z.string().nullable(),
  days: z.number(),
  stuck: z.number().nullable(),
  moments: z.array(z.enum(["ok", "surprise", "idea", "question", "bug"])),
  counts: z.object({ bug: z.number(), idea: z.number(), question: z.number() }),
}) satisfies z.ZodType<ServedRow>;

export const testsSchema = z.object({
  tests: z.array(testRowSchema),
  personas: z.array(testPersonaSchema),
}) satisfies z.ZodType<ReturnType<typeof testsView>>;

export const testPageSchema = z.object({
  test: z.object({
    ...testRowSchema.shape,
    story: z.string(),
    dayTitles: z.array(z.string()),
    errors: z.array(z.object({ day: z.number(), text: z.string() })),
  }),
  moments: z.array(
    z.object({
      ...testStepSchema.shape,
      number: z.number(),
      signals: z.array(signalRowSchema),
    }),
  ),
  other: z.array(signalRowSchema),
}) satisfies z.ZodType<ServedPage>;

const draftSchema = z.object({
  title: z.string(),
  story: z.string(),
  days: z.array(testDaySchema),
  product: z.string().nullable(),
  app: z.string().nullable(),
  locale: z.string().nullable(),
  timeZone: z.string().nullable(),
}) satisfies z.ZodType<ServedDraft>;

export const draftAnswerSchema = z.object({ draft: draftSchema });

export const startedSchema = z.object({
  test: z.object({ id: z.string() }),
});

export type TestRow = z.infer<typeof testRowSchema>;
export type TestPersona = z.infer<typeof testPersonaSchema>;
export type TestPage = z.infer<typeof testPageSchema>;
export type TestMoment = TestPage["moments"][number];
export type TestDraft = z.infer<typeof draftSchema>;
