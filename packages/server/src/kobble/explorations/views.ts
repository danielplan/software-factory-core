// What the Explorations pages show: the list (being explored, with what the
// canvas holds and one line from the kobold; waiting; handed off and
// dropped) and one exploration with its board, its prototypes as they run,
// their tests, and the conversation.

import {
  type Board,
  type Exploration,
  type Face,
  faceOf,
  type KobbleStore,
  type PersonaTest,
} from "@software-factory/core";

import type { VersionRun } from "../../prototypes/mode.ts";
import { type SignalRow, signalRows } from "../views.ts";
import type { TalkView } from "./talks.ts";

type PersonaTag = { id: string; name: string; face: Face };

export type ExplorationRow = Pick<
  Exploration,
  "id" | "title" | "status" | "problem" | "work"
> & {
  personas: PersonaTag[];
  signals: number;
  options: string[];
  prototypes: { key: string; agreed: boolean }[];
  // What is next, in one line from the kobold; none when it has nothing.
  line: string | null;
};

export type ExplorationsView = {
  exploring: ExplorationRow[];
  waiting: ExplorationRow[];
  done: ExplorationRow[];
};

// A prototype's last persona test, in short.
export type TestResult = {
  id: string;
  status: PersonaTest["status"];
  steps: number;
  asExpected: number;
  persona: string;
};

export type ExplorationPage = {
  exploration: Exploration;
  personas: PersonaTag[];
  heard: SignalRow[];
  board: Board;
  runs: VersionRun[];
  tests: Record<string, TestResult | null>;
  talk: TalkView;
};

function tagsOf(store: KobbleStore, ids: string[]): PersonaTag[] {
  return ids.flatMap((id) => {
    const persona = store.get("personas", id);
    return persona ? [{ id, name: persona.name, face: faceOf(persona) }] : [];
  });
}

// The kobold's line: the agreed prototype can be handed off, or the last
// question it asked.
function lineOf(board: Board, talk: TalkView): string | null {
  const agreed = board.prototypes.find((one) => one.agreed);
  if (agreed) return `${agreed.key} is agreed. You can hand it off.`;
  const said = talk.messages.findLast((m) => m.from === "kobold")?.text ?? "";
  const question = said
    .split(/(?<=[.!?])\s+/)
    .findLast((sentence) => sentence.trim().endsWith("?"));
  return question?.trim() ?? null;
}

export function explorationsView(
  store: KobbleStore,
  talk: (id: string) => TalkView,
): ExplorationsView {
  const rows = store.all("explorations").map((exploration) => {
    const board = store.board(exploration.id);
    return {
      id: exploration.id,
      title: exploration.title,
      status: exploration.status,
      problem: exploration.problem,
      work: exploration.work,
      personas: tagsOf(store, exploration.personas),
      signals: exploration.signals.length,
      options: board.options.map((one) => one.key),
      prototypes: board.prototypes.map(({ key, agreed }) => ({ key, agreed })),
      line:
        exploration.status === "exploring"
          ? lineOf(board, talk(exploration.id))
          : null,
    };
  });
  return {
    exploring: rows.filter((row) => row.status === "exploring"),
    waiting: rows.filter((row) => row.status === "waiting"),
    done: rows.filter((row) => ["handed-off", "dropped"].includes(row.status)),
  };
}

export function explorationPage(
  store: KobbleStore,
  exploration: Exploration,
  more: { runs: VersionRun[]; talk: TalkView },
): ExplorationPage {
  const board = store.board(exploration.id);
  const tests = store.all("tests");
  const heard = store
    .all("signals")
    .filter((signal) => exploration.signals.includes(signal.id));
  return {
    exploration,
    personas: tagsOf(store, exploration.personas),
    heard: signalRows(heard, store.all("personas")),
    board,
    runs: more.runs,
    tests: Object.fromEntries(
      board.prototypes.map((made) => {
        const last = tests.find((test) => test.id === made.tests.at(-1));
        return [made.key, last ? resultOf(last) : null];
      }),
    ),
    talk: more.talk,
  };
}

function resultOf(test: PersonaTest): TestResult {
  return {
    id: test.id,
    status: test.status,
    steps: test.steps.length,
    asExpected: test.steps.filter((step) => step.asExpected).length,
    persona: test.persona,
  };
}
