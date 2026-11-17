// What the Explorations pages show: the list (being explored, with what the
// canvas holds and one line from the kobold; waiting; handed off and
// dropped) and one exploration with its board, its prototypes as they run,
// their tests, and the conversation.

import {
  type Board,
  type Exploration,
  type Face,
  faceOf,
  type Heard,
  type KobbleStore,
  type PersonaTest,
  type Thing,
} from "@software-factory/core";

import type { VersionRun } from "../../prototypes/mode.ts";

import { completed } from "./board-things.ts";
import type { TalkView } from "./talks.ts";

type PersonaTag = { id: string; name: string; face: Face };

export type ExplorationRow = Pick<
  Exploration,
  "id" | "title" | "status" | "problem" | "work"
> & {
  personas: PersonaTag[];
  signals: number;
  // The board in small, for its preview: each thing's kind and whether it
  // is agreed, and the arrows.
  things: { id: string; kind: Thing["kind"]; agreed: boolean }[];
  links: { from: string; to: string }[];
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
  // What it heard, from its own copy, with each persona's name and face.
  heard: (Heard & { personaName: string | null; personaFace: Face | null })[];
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
  const agreed = board.things.find(
    (one) => one.kind === "prototype" && one.agreed,
  );
  if (agreed?.kind === "prototype")
    return `${agreed.key} is agreed. You can hand it off.`;
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
    const board = completed(exploration, store.board(exploration.id));
    return {
      id: exploration.id,
      title: exploration.title,
      status: exploration.status,
      problem: exploration.problem,
      work: exploration.work,
      personas: tagsOf(store, exploration.personas),
      signals: exploration.signals.length,
      things: board.things.map(({ id, kind, agreed }) => ({
        id,
        kind,
        agreed,
      })),
      links: board.links.map(({ from, to }) => ({ from, to })),
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
  const board = completed(exploration, store.board(exploration.id));
  const tests = store.all("tests");

  return {
    exploration,
    personas: tagsOf(store, exploration.personas),
    heard: exploration.heard.map((one) => {
      const persona = one.persona ? store.get("personas", one.persona) : null;
      return {
        ...one,
        personaName: persona?.name ?? null,
        personaFace: persona ? faceOf(persona) : null,
      };
    }),
    board,
    runs: more.runs,
    tests: Object.fromEntries(
      board.things.flatMap((made) => {
        if (made.kind !== "prototype") return [];
        const last = tests.find((test) => test.id === made.tests.at(-1));
        return [[made.key, last ? resultOf(last) : null]];
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
