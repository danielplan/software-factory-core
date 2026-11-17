// The check-up's routes (checks.ts): what was checked and found, a check
// started (one product, or every one), stopped, and a finding sent to Build
// or set aside as not a problem. Like every button, a POST is answered only
// from the factory's page (server.ts). The page hears a check's progress on
// its stream with the kobold's jobs.

import { z } from "zod";

import type { Route } from "../add-ons/add-on.ts";
import { field } from "../asked.ts";
import { parsed } from "../records/person.ts";
import { whoIs } from "../records/who.ts";
import { Checks, type ChecksOn } from "./checks.ts";
import { LANGUAGES, type Language } from "./prompt.ts";

const startSchema = z.strictObject({
  product: z.string().min(1).optional(),
  language: z
    .enum(Object.keys(LANGUAGES) as [Language, ...Language[]])
    .optional(),
});

const findingSchema = z.strictObject({
  product: z.string().min(1),
  finding: z.string().min(1),
});

export function checkRoutes(on: ChecksOn): Record<string, Route> {
  const checks = new Checks(on);
  return {
    "GET /api/checks": () => checks.view(),
    "POST /api/checks/start": (body) => {
      const { product, language } = parsed(startSchema, body, "check-up");
      checks.start(product ?? null, language);
      return checks.view();
    },
    "POST /api/checks/stop": (body) => {
      checks.stop(field(body, "product"));
    },
    "POST /api/checks/dismiss": (body) => {
      const { product, finding } = parsed(findingSchema, body, "finding");
      checks.dismiss(product, finding);
    },
    "POST /api/checks/send": async (body) => {
      const { product, finding } = parsed(findingSchema, body, "finding");
      return await checks.send(product, finding, await whoIs(on.project));
    },
  };
}
