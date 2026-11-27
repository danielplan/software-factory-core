// What the Testing pages show, worked out from the tests, the personas
// (Personas' plug) and the signals each test filed (Signals' plug: none
// while Signals is not installed).

import {
  type Face,
  faceOf,
  type KobblePersona,
  type KobbleSignal,
  type KobbleStore,
  type PersonaTest,
  type TestStep,
} from "@software-factory/core";

import { type SignalRow, signalRows } from "../../kobble/signal-rows.ts";
import type { TestNow } from "../../plugs/tests.ts";
import { Refused } from "../../refused.ts";

// Who a test is about, as the pages show them.
export type TestPersona = Pick<
  KobblePersona,
  "id" | "name" | "place" | "about"
> & { face: Face };

// How one moment went: the kind of the worst signal filed at it, or ok.
export type MomentKind = "ok" | "idea" | "question" | "bug";

export type TestRow = {
  id: string;
  title: string;
  persona: TestPersona | null;
  status: PersonaTest["status"];
  on: string;
  started: string | null;
  ended: string | null;
  doing: string | null;
  problem: string | null;
  days: number;
  moments: MomentKind[];
  counts: { bug: number; idea: number; question: number };
};

export type TestMoment = TestStep & {
  number: number;
  signals: SignalRow[];
};

export type TestPage = {
  test: TestRow & { story: string; dayTitles: string[] };
  moments: TestMoment[];
  // Signals filed for the whole test, not at a moment.
  other: SignalRow[];
};

const going = (test: PersonaTest) =>
  test.status === "queued" || test.status === "running";

const WORST: MomentKind[] = ["bug", "question", "idea"];

function personaOf(persona: KobblePersona | undefined): TestPersona | null {
  if (!persona) return null;
  const { id, name, place, about } = persona;
  return { id, name, place, about, face: faceOf(persona) };
}

function filedBy(test: PersonaTest, signals: KobbleSignal[]): KobbleSignal[] {
  return signals.filter((signal) => test.signals.includes(signal.id));
}

function kindAt(number: number, filed: KobbleSignal[]): MomentKind {
  const here = filed.filter((signal) => signal.step?.number === number);
  return WORST.find((kind) => here.some((one) => one.type === kind)) ?? "ok";
}

function rowOf(
  test: PersonaTest,
  personas: KobblePersona[],
  signals: KobbleSignal[],
): TestRow {
  const filed = filedBy(test, signals);
  const count = (type: string) =>
    filed.filter((signal) => signal.type === type).length;
  return {
    id: test.id,
    title: test.title,
    persona: personaOf(personas.find((one) => one.id === test.persona)),
    status: test.status,
    on: test.on,
    started: test.started,
    ended: test.ended,
    doing: test.doing ?? null,
    problem: test.problem,
    days: test.days.length,
    moments: test.steps.map((_, index) => kindAt(index + 1, filed)),
    counts: {
      bug: count("bug"),
      idea: count("idea"),
      question: count("question"),
    },
  };
}

// The tests running or waiting now, for Signals and Explorations.
export function testsNow(
  store: KobbleStore,
  personas: KobblePersona[],
): TestNow[] {
  return store
    .all("tests")
    .filter(going)
    .flatMap((test) => {
      const persona = personas.find((one) => one.id === test.persona);
      if (!persona) return [];
      return [
        {
          id: test.id,
          persona: persona.id,
          name: persona.name,
          face: faceOf(persona),
          status: test.status,
          doing: test.doing ?? null,
        },
      ];
    });
}

// Every test, the last one first, and the personas there are (to start
// one).
export function testsView(
  store: KobbleStore,
  personas: KobblePersona[],
  signals: KobbleSignal[],
): { tests: TestRow[]; personas: TestPersona[] } {
  return {
    tests: store
      .all("tests")
      .reverse()
      .map((test) => rowOf(test, personas, signals)),
    personas: personas.flatMap((one) => personaOf(one) ?? []),
  };
}

// One test: its story, its moments day by day with what was filed at each.
export function testPage(
  store: KobbleStore,
  id: string,
  personas: KobblePersona[],
  signals: KobbleSignal[],
): TestPage {
  const test = store.get("tests", id);
  if (!test) throw new Refused(`There is no test “${id}”.`);
  const rows = signalRows(filedBy(test, signals), personas);
  return {
    test: {
      ...rowOf(test, personas, signals),
      story: test.story,
      dayTitles: test.days.map((day) => day.title),
    },
    moments: test.steps.map((step, index) => ({
      ...step,
      number: index + 1,
      signals: rows.filter((row) => row.step?.number === index + 1),
    })),
    other: rows.filter((row) => !row.step),
  };
}
