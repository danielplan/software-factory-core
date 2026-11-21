// Persona tests, called missions on the page: the kobold uses the app as one
// persona would, on this computer only (never the live app), through a
// browser, and keeps a think-aloud diary of each step (what it did, what it
// expected, whether that happened), saying the step it is on as it goes.
// Then, as the analyst, it turns the diary into signals in the person's
// words (source test): a bug, an idea or an open question, each at the step
// where it happened, through the "already" check like any other. Several
// run at once (at most AT_ONCE, the others wait), one at a time for each
// persona. Each change of a test is told to the page. The method is the
// persona-test skill.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  type Claude,
  type KobblePersona,
  type KobbleStore,
  type PersonaTest,
  takeInFindings,
  type TestStep,
} from "@software-factory/core";
import { skillsFolder } from "@software-factory/skills";
import { z } from "zod";

import { Refused } from "../refused.ts";
import { inLanguage } from "../language.ts";

// A reason a test cannot go on, said in plain words.
export class TestProblem extends Error {}

export type Browser = { url: string; close: () => void };

export type TestOptions = {
  claude: Claude;
  // The project, where the agents run (they read nothing in it).
  cwd: string;
  store: () => KobbleStore;
  // The address of the app under test, started on this computer: the
  // product (or the first with a web address) as it is now (main), or a
  // prototype's branch (in the world of the persona's situation, when it
  // names one).
  app: (
    test: Pick<PersonaTest, "on" | "persona" | "product">,
  ) => Promise<string>;
  // A browser the persona agent uses through MCP.
  browser: () => Promise<Browser>;
  onChange: () => void;
  now?: () => Date;
  // How many run at once; AT_ONCE unless the tests say otherwise.
  atOnce?: number;
};

const TIME_LIMIT_MS = 20 * 60_000;
// Each test is a browser and a Claude Code on the owner's computer: a few
// at once, the others wait their turn.
const AT_ONCE = 3;

const diarySchema = z.object({
  steps: z.array(
    z.object({
      did: z.string().min(1),
      expected: z.string().min(1),
      asExpected: z.boolean(),
      note: z.string().optional(),
    }),
  ),
});

const findingsSchema = z.object({
  signals: z.array(
    z.object({
      type: z.enum(["bug", "idea", "question"]),
      text: z.string().trim().min(1),
      // The diary's step it happened at, from 1.
      step: z.number().int().nullable().optional(),
    }),
  ),
});

// The line the persona agent writes before each step: "Step 3: …".
const STEP_LINE = /^Step (\d+):(.*)$/gm;

export class PersonaTests {
  private readonly waiting: string[] = [];
  private readonly going = new Set<Promise<void>>();
  // An app being started for a test, so two tests at once start it once.
  private readonly starting = new Map<string, Promise<string>>();
  private readonly options: TestOptions;

  constructor(options: TestOptions) {
    this.options = options;
  }

  // A new test: it starts now when fewer than AT_ONCE run, else when one
  // of them is done. A persona already on one is refused.
  start(body: unknown): PersonaTest {
    const { persona, task, on, product } = z
      .object({
        persona: z.string().min(1),
        task: z.string().trim().min(1),
        on: z.string().default("main"),
        product: z.string().min(1).nullable().default(null),
      })
      .catch({ persona: "", task: "", on: "main", product: null })
      .parse(body);
    if (!task) throw new Refused("Say what the persona should try.");
    const store = this.options.store();
    const who = store.get("personas", persona);
    if (!who) throw new Refused(`There is no persona “${persona}”.`);
    if (
      store
        .all("tests")
        .some(
          (one) =>
            one.persona === persona &&
            (one.status === "queued" || one.status === "running"),
        )
    )
      throw new Refused(`${who.name} is on a mission already.`);
    const test = store.put("tests", {
      id: store.nextId("tests"),
      persona,
      task,
      on,
      product,
      status: "queued",
      started: null,
      ended: null,
      steps: [],
      doing: null,
      signals: [],
      problem: null,
    });
    this.options.onChange();
    this.waiting.push(test.id);
    this.next();
    return test;
  }

  // Tests left running or waiting when the factory last stopped did not
  // finish: they say so.
  recover(): void {
    const store = this.options.store();
    for (const test of store.all("tests"))
      if (test.status === "running" || test.status === "queued")
        store.put("tests", {
          ...test,
          status: "failed",
          ended: test.ended ?? this.now(),
          doing: null,
          problem: "The factory stopped before the mission finished.",
        });
  }

  // Waits for every test started so far (for the tests of this module).
  async settled(): Promise<void> {
    while (this.going.size > 0) await Promise.all(this.going);
  }

  // Starts the waiting tests while fewer than AT_ONCE run.
  private next(): void {
    const most = this.options.atOnce ?? AT_ONCE;
    while (this.going.size < most && this.waiting.length > 0) {
      const id = this.waiting.shift() ?? "";
      const run: Promise<void> = this.run(id).finally(() => {
        this.going.delete(run);
        this.next();
      });
      this.going.add(run);
    }
  }

  private now(): string {
    return (this.options.now ?? (() => new Date()))().toISOString();
  }

  private update(id: string, change: Partial<PersonaTest>): PersonaTest {
    const store = this.options.store();
    const test = store.get("tests", id);
    if (!test) throw new TestProblem(`The mission ${id} is gone.`);
    const next = store.put("tests", { ...test, ...change });
    this.options.onChange();
    return next;
  }

  private async run(id: string): Promise<void> {
    let browser: Browser | null = null;
    try {
      const test = this.update(id, { status: "running", started: this.now() });
      const persona = this.options.store().get("personas", test.persona);
      if (!persona) throw new TestProblem("Its persona is gone.");
      const app = await this.appFor(test);
      browser = await this.options.browser();
      const steps = await this.use(test, persona, app, browser.url);
      this.update(id, { steps, doing: null });
      const signals = await this.analyse(test, persona, steps);
      this.update(id, { status: "done", ended: this.now(), signals });
    } catch (error) {
      this.update(id, {
        status: "failed",
        ended: this.now(),
        doing: null,
        problem: error instanceof Error ? error.message : String(error),
      });
    } finally {
      browser?.close();
    }
  }

  // The app's address; the same app asked for twice at once is started once.
  private appFor(test: PersonaTest): Promise<string> {
    const key = [
      test.on,
      test.product ?? "",
      test.on === "main" ? "" : test.persona,
    ].join(" ");
    const known = this.starting.get(key);
    if (known) return known;
    const started = this.options.app(test).finally(() => {
      this.starting.delete(key);
    });
    this.starting.set(key, started);
    return started;
  }

  // Part 1: the persona agent uses the app through the browser only, and
  // says the step it is on as it goes.
  private async use(
    test: PersonaTest,
    persona: KobblePersona,
    app: string,
    browser: string,
  ): Promise<TestStep[]> {
    let doing: string | null = null;
    const said = await this.ask(
      [
        "Part 1: use the app as the persona.",
        who(persona),
        `The task: ${test.task}`,
        `The app runs at ${app}. Open it in the browser.`,
      ].join("\n\n"),
      {
        mcp: { name: "browser", url: browser, headers: {} },
        onText: (text) => {
          const now = stepNow(text);
          if (now && now !== doing) {
            doing = now;
            this.update(test.id, { doing: now });
          }
        },
      },
    );
    return answerOf(said, diarySchema, "diary").steps;
  }

  // Part 2: the analyst turns the diary into signals, each at its step.
  private async analyse(
    test: PersonaTest,
    persona: KobblePersona,
    steps: TestStep[],
  ): Promise<string[]> {
    const said = await this.ask(
      [
        "Part 2: the analyst.",
        who(persona),
        `The task was: ${test.task}`,
        `The diary, its steps numbered from 1:\n${JSON.stringify({ steps }, null, 2)}`,
      ].join("\n\n"),
    );
    const { signals } = answerOf(said, findingsSchema, "signals");
    return takeInFindings(this.options.store(), {
      persona: persona.id,
      at: this.now(),
      findings: signals.map((signal) => {
        const step = signal.step ? steps[signal.step - 1] : undefined;
        return {
          type: signal.type,
          text: signal.text,
          step:
            step && signal.step
              ? { test: test.id, number: signal.step, did: step.did }
              : null,
        };
      }),
    }).map((signal) => signal.id);
  }

  private async ask(
    prompt: string,
    more: {
      mcp?: { name: string; url: string; headers: Record<string, string> };
      onText?: (text: string) => void;
    } = {},
  ): Promise<string> {
    const result = await this.options.claude.run({
      cwd: this.options.cwd,
      prompt,
      readOnly: true,
      // No tool of its own: only the browser, when it has one.
      tools: [],
      ...more,
      instructions: inLanguage(personaTestSkill()),
      session: { id: randomUUID(), resume: false },
      timeLimitMs: TIME_LIMIT_MS,
      onActivity: () => {},
    });
    if (!result.ok)
      throw new TestProblem(
        `Claude Code could not run the mission: ${result.error ?? "no reason given"}.`,
      );
    return result.text;
  }
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

// The JSON at the end of an answer, checked.
export function answerOf<T>(
  said: string,
  schema: z.ZodType<T>,
  what: string,
): T {
  const start = said.indexOf("{");
  const end = said.lastIndexOf("}");
  try {
    return schema.parse(JSON.parse(said.slice(start, end + 1)));
  } catch {
    throw new TestProblem(`The kobold's ${what} could not be read.`);
  }
}
