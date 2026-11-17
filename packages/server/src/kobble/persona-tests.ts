// Persona tests: the kobold uses the app as one persona would, on this
// computer only (never the live app), through a browser, and keeps a
// think-aloud diary of each step (what it did, what it expected, whether
// that happened). Then, as the analyst, it turns the diary into signals in
// the person's words (source test), which go through the "already" check
// like any other. One test at a time; the others wait in the queue. Each
// change of a test is told to the page. The method is the persona-test
// skill.

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

// A reason a test cannot go on, said in plain words.
export class TestProblem extends Error {}

export type Browser = { url: string; close: () => void };

export type TestOptions = {
  claude: Claude;
  // The project, where the agents run (they read nothing in it).
  cwd: string;
  store: () => KobbleStore;
  // The address of the app under test, started on this computer: the app
  // as it is now (main), or a prototype's branch.
  app: (on: string) => Promise<string>;
  // A browser the persona agent uses through MCP.
  browser: () => Promise<Browser>;
  onChange: () => void;
  now?: () => Date;
};

const TIME_LIMIT_MS = 20 * 60_000;

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
      type: z.enum(["bug", "feedback"]),
      text: z.string().trim().min(1),
    }),
  ),
});

export class PersonaTests {
  private line: Promise<void> = Promise.resolve();
  private readonly options: TestOptions;

  constructor(options: TestOptions) {
    this.options = options;
  }

  // A new test, queued; it runs when the ones before it are done.
  start(body: unknown): PersonaTest {
    const { persona, task, on } = z
      .object({
        persona: z.string().min(1),
        task: z.string().trim().min(1),
        on: z.string().default("main"),
      })
      .catch({ persona: "", task: "", on: "main" })
      .parse(body);
    if (!task) throw new Refused("Say what the persona should try.");
    const store = this.options.store();
    if (!store.get("personas", persona))
      throw new Refused(`There is no persona “${persona}”.`);
    const test = store.put("tests", {
      id: store.nextId("tests"),
      persona,
      task,
      on,
      status: "queued",
      started: null,
      ended: null,
      steps: [],
      signals: [],
      problem: null,
    });
    this.options.onChange();
    this.line = this.line.then(() => this.run(test.id));
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
          problem: "The factory stopped before the test finished.",
        });
  }

  // Waits for every test queued so far (for the tests of this module).
  settled(): Promise<void> {
    return this.line;
  }

  private now(): string {
    return (this.options.now ?? (() => new Date()))().toISOString();
  }

  private update(id: string, change: Partial<PersonaTest>): PersonaTest {
    const store = this.options.store();
    const test = store.get("tests", id);
    if (!test) throw new TestProblem(`The test ${id} is gone.`);
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
      const app = await this.options.app(test.on);
      browser = await this.options.browser();
      const steps = await this.use(test, persona, app, browser.url);
      this.update(id, { steps });
      const signals = await this.analyse(test, persona, steps);
      this.update(id, { status: "done", ended: this.now(), signals });
    } catch (error) {
      this.update(id, {
        status: "failed",
        ended: this.now(),
        problem: error instanceof Error ? error.message : String(error),
      });
    } finally {
      browser?.close();
    }
  }

  // Part 1: the persona agent uses the app through the browser only.
  private async use(
    test: PersonaTest,
    persona: KobblePersona,
    app: string,
    browser: string,
  ): Promise<TestStep[]> {
    const said = await this.ask(
      [
        "Part 1: use the app as the persona.",
        who(persona),
        `The task: ${test.task}`,
        `The app runs at ${app}. Open it in the browser.`,
      ].join("\n\n"),
      { name: "browser", url: browser, headers: {} },
    );
    return answerOf(said, diarySchema, "diary").steps;
  }

  // Part 2: the analyst turns the diary into signals.
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
        `The diary:\n${JSON.stringify({ steps }, null, 2)}`,
      ].join("\n\n"),
    );
    const { signals } = answerOf(said, findingsSchema, "signals");
    return takeInFindings(this.options.store(), {
      persona: persona.id,
      at: this.now(),
      findings: signals,
    }).map((signal) => signal.id);
  }

  private async ask(
    prompt: string,
    mcp?: { name: string; url: string; headers: Record<string, string> },
  ): Promise<string> {
    const result = await this.options.claude.run({
      cwd: this.options.cwd,
      prompt,
      readOnly: true,
      // No tool of its own: only the browser, when it has one.
      tools: [],
      ...(mcp ? { mcp } : {}),
      instructions: readFileSync(
        join(skillsFolder, "persona-test", "SKILL.md"),
        "utf8",
      ),
      session: { id: randomUUID(), resume: false },
      timeLimitMs: TIME_LIMIT_MS,
      onActivity: () => {},
    });
    if (!result.ok)
      throw new TestProblem(
        `Claude Code could not run the test: ${result.error ?? "no reason given"}.`,
      );
    return result.text;
  }
}

function who(persona: KobblePersona): string {
  return [
    `You are ${persona.name}`,
    persona.place && `(${persona.place})`,
    persona.about && `: ${persona.about}`,
  ]
    .filter(Boolean)
    .join(" ");
}

// The JSON at the end of an answer, checked.
function answerOf<T>(said: string, schema: z.ZodType<T>, what: string): T {
  const start = said.indexOf("{");
  const end = said.lastIndexOf("}");
  try {
    return schema.parse(JSON.parse(said.slice(start, end + 1)));
  } catch {
    throw new TestProblem(`The kobold's ${what} could not be read.`);
  }
}
