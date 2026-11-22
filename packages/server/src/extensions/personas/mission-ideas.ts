// The mission the kobold suggests for a persona: one sentence of what they
// would try, and which of the apps they would try it in, worked out from
// who they are, the apps there are and the missions they were sent on
// before. Kept here (not in the persona's file, which the team shares) until
// the persona is sent; then the next one is asked for.

import { randomUUID } from "node:crypto";

import type { Claude, KobbleStore } from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../../refused.ts";
import { answerOf, personaTestSkill, who } from "./persona-tests.ts";
import { inLanguage } from "../../language.ts";

// An app a persona can be sent into: a product the factory starts with a
// web address.
export type App = { id: string; name: string; does: string };

export type MissionIdea = {
  task: string;
  // The app's product id and name; none when there is no app.
  product: string | null;
  app: string | null;
};

const ideaSchema = z.object({
  app: z.string().nullable().optional(),
  mission: z.string().trim().min(1),
});

const TIME_LIMIT_MS = 3 * 60_000;

export class MissionIdeas {
  private readonly known = new Map<string, Promise<MissionIdea>>();
  private readonly options: {
    claude: Claude;
    cwd: string;
    store: () => KobbleStore;
    apps: () => App[];
  };

  constructor(options: MissionIdeas["options"]) {
    this.options = options;
  }

  // The suggestion for a persona: the one asked for already, or a new one.
  // One that failed stays failed (the page reads again on every change)
  // until it is asked for again on purpose.
  suggest(persona: string, again = false): Promise<MissionIdea> {
    if (again) this.forget(persona);
    const known = this.known.get(persona);
    if (known) return known;
    const asked = this.ask(persona);
    this.known.set(persona, asked);
    return asked;
  }

  // The persona was sent: the next suggestion is a new one.
  forget(persona: string): void {
    this.known.delete(persona);
  }

  private async ask(id: string): Promise<MissionIdea> {
    const store = this.options.store();
    const persona = store.get("personas", id);
    if (!persona) throw new Refused(`There is no persona “${id}”.`);
    const apps = this.options.apps();
    const listed = apps.map((app) => `- ${app.id}: ${app.name}, ${app.does}`);
    const before = store
      .all("tests")
      .filter((test) => test.persona === id)
      .map((test) => `- ${test.task}`);
    const result = await this.options.claude.run({
      cwd: this.options.cwd,
      prompt: [
        "Part 0: suggest a mission.",
        who(persona),
        apps.length > 0
          ? `The apps:\n${listed.join("\n")}`
          : "There is one app.",
        before.length > 0
          ? `Missions they were sent on before:\n${before.join("\n")}`
          : "They were not sent on a mission yet.",
      ].join("\n\n"),
      readOnly: true,
      tools: [],
      instructions: inLanguage(personaTestSkill()),
      session: { id: randomUUID(), resume: false },
      timeLimitMs: TIME_LIMIT_MS,
      onActivity: () => {},
    });
    if (!result.ok)
      throw new Refused(
        `The kobold could not suggest a mission: ${result.error ?? "no reason given"}.`,
      );
    const idea = ideaOf(result.text);
    const app = apps.find((one) => one.id === idea.app) ?? apps[0];
    return {
      task: idea.mission,
      product: app?.id ?? null,
      app: app?.name ?? null,
    };
  }
}

function ideaOf(said: string): z.infer<typeof ideaSchema> {
  try {
    return answerOf(said, ideaSchema, "mission");
  } catch (error) {
    throw new Refused(error instanceof Error ? error.message : String(error));
  }
}
