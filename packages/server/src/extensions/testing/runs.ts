// Tests: a persona lives a few days in the app, on this computer only (never
// the live app), through a browser. Mimic writes the story and the days
// (Part 0), lives one day at a time as the persona, keeping a diary of each
// moment with a picture of the screen (Part 1), then turns the diary into
// signals as the analyst (Part 2): prompts.ts. A few run at once, the
// others wait; one at a time for each persona.

import { randomUUID } from "node:crypto";

import {
  type Claude,
  type KobblePersona,
  type KobbleStore,
  type PersonaTest,
  type TestDay,
  type TestStep,
} from "@software-factory/core";

import { Refused } from "../../refused.ts";
import {
  type App,
  type Browser,
  type BrowserWish,
  TestProblem,
} from "../../kobble/browser.ts";
import type { PersonasPlug } from "../../plugs/personas.ts";
import type { SignalsPlug } from "../../plugs/signals.ts";
import { inLanguage } from "../../language.ts";
import { askedOf, newTest, type TestDraft } from "./new-test.ts";
import {
  analystPrompt,
  answerOf,
  dayPrompt,
  diarySchema,
  draftOf,
  draftPrompt,
  findingsOf,
  personaTestSkill,
  stepNow,
} from "./prompts.ts";

export type TestOptions = {
  claude: Claude;
  // The project, where the agents run (they read nothing in it).
  cwd: string;
  store: () => KobbleStore;
  // Personas' plug: who is tested (Testing needs Personas).
  personas: () => PersonasPlug | null;
  // Signals' plug, where the findings go; none while Signals is not
  // installed, and then a test files nothing.
  signals: () => SignalsPlug | null;
  // The apps a persona can be sent into, for writing the story.
  apps: () => App[];
  // The address of the app under test, started on this computer: the
  // product (or the first with a web address) as it is now (main), or a
  // prototype's branch.
  app: (
    test: Pick<PersonaTest, "on" | "persona" | "product">,
  ) => Promise<string>;
  // A browser the persona agent uses through MCP.
  browser: (wish: BrowserWish) => Promise<Browser>;
  onChange: () => void;
  now?: () => Date;
  // How many run at once; AT_ONCE unless the tests say otherwise.
  atOnce?: number;
};

const DAY_LIMIT_MS = 20 * 60_000;
const DRAFT_LIMIT_MS = 3 * 60_000;
// Each test is a browser and a Claude Code on the owner's computer: a few
// at once, the others wait their turn.
const AT_ONCE = 3;

export class TestRuns {
  private readonly waiting: string[] = [];
  private readonly going = new Set<Promise<void>>();
  // An app being started for a test, so two tests at once start it once.
  private readonly starting = new Map<string, Promise<string>>();
  private readonly options: TestOptions;

  constructor(options: TestOptions) {
    this.options = options;
  }

  // Mimic's story and days for a persona, worked out from who they are,
  // the apps there are and their tests before. Nothing is kept until the
  // test is started.
  async draft(id: string): Promise<TestDraft> {
    const store = this.options.store();
    const persona = this.persona(id);
    const apps = this.options.apps();
    const before = store
      .all("tests")
      .filter((test) => test.persona === id)
      .map((test) => `- ${test.title}`);
    const said = await this.ask(draftPrompt(persona, apps, before), {
      timeLimitMs: DRAFT_LIMIT_MS,
      Problem: Refused,
    });
    return draftOf(said, apps);
  }

  // A new test: it starts now when fewer than AT_ONCE run, else when one
  // of them is done. A persona already in one is refused.
  start(body: unknown): PersonaTest {
    const asked = askedOf(body);
    const store = this.options.store();
    const persona = this.persona(asked.persona);
    if (
      store
        .all("tests")
        .some(
          (one) =>
            one.persona === persona.id &&
            (one.status === "queued" || one.status === "running"),
        )
    )
      throw new Refused(`${persona.name} is in a test already.`);
    const test = store.put(
      "tests",
      newTest(store.nextId("tests"), asked, persona),
    );
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
          problem: "The factory stopped before the test finished.",
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

  private persona(id: string): KobblePersona {
    const persona = this.options.personas()?.get(id);
    if (!persona) throw new Refused(`There is no persona “${id}”.`);
    return persona;
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
      const persona = this.options.personas()?.get(test.persona);
      if (!persona) throw new TestProblem("Its persona is gone.");
      const app = await this.appFor(test);
      browser = await this.options.browser({
        shots: this.options.store().testShots(test.id),
        locale: test.locale ?? null,
        timeZone: test.timeZone ?? null,
      });
      const steps: TestStep[] = [];
      for (const [index, day] of test.days.entries()) {
        const lived = await this.live(test, persona, app, browser.url, {
          number: index + 1,
          day,
          before: steps,
        });
        steps.push(...lived);
        this.update(id, { steps: [...steps] });
      }
      this.update(id, { doing: null });
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

  // Part 1: the persona lives one day in the app through the browser only,
  // and says the moment they are at as they go.
  private async live(
    test: PersonaTest,
    persona: KobblePersona,
    app: string,
    browser: string,
    today: { number: number; day: TestDay; before: TestStep[] },
  ): Promise<TestStep[]> {
    let doing: string | null = null;
    const { number, day, before } = today;
    const said = await this.ask(
      dayPrompt({ test, persona, app, number, day, before }),
      {
        mcp: { name: "browser", url: browser, headers: {} },
        onText: (text) => {
          const now = stepNow(text);
          if (now && now !== doing) {
            doing = now;
            this.update(test.id, { doing: `Day ${String(number)} · ${now}` });
          }
        },
      },
    );
    const store = this.options.store();
    return answerOf(said, diarySchema, "diary").steps.map((step) => ({
      day: number,
      time: step.time ?? null,
      did: step.did,
      expected: step.expected,
      asExpected: step.asExpected,
      ...(step.note ? { note: step.note } : {}),
      shot:
        step.shot && store.testShotFile(test.id, step.shot) ? step.shot : null,
    }));
  }

  // Part 2: the analyst turns the diary into signals, each at its moment.
  private async analyse(
    test: PersonaTest,
    persona: KobblePersona,
    steps: TestStep[],
  ): Promise<string[]> {
    const said = await this.ask(analystPrompt(test, persona, steps));
    const reported = findingsOf(said, { test, persona, steps, at: this.now() });
    return (this.options.signals()?.report(reported) ?? []).map(
      (signal) => signal.id,
    );
  }

  private async ask(
    prompt: string,
    more: {
      mcp?: { name: string; url: string; headers: Record<string, string> };
      onText?: (text: string) => void;
      timeLimitMs?: number;
      Problem?: new (message: string) => Error;
    } = {},
  ): Promise<string> {
    const { timeLimitMs, Problem = TestProblem, ...rest } = more;
    const result = await this.options.claude.run({
      cwd: this.options.cwd,
      prompt,
      readOnly: true,
      // No tool of its own: only the browser, when it has one.
      tools: [],
      ...rest,
      instructions: inLanguage(personaTestSkill()),
      session: { id: randomUUID(), resume: false },
      timeLimitMs: timeLimitMs ?? DAY_LIMIT_MS,
      onActivity: () => {},
    });
    if (!result.ok)
      throw new Problem(
        `Claude Code could not run the test: ${result.error ?? "no reason given"}.`,
      );
    return result.text;
  }
}
