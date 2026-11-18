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
  // The board in small, for its preview: each thing's kind, a few of its
  // own words, whether it is agreed, and the arrows.
  things: { id: string; kind: Thing["kind"]; agreed: boolean; label: string }[];
  links: { from: string; to: string }[];
  // What is next, in one line from the kobold; none when it has nothing.
  line: string | null;
  // What the kobold is busy with here right now (making a prototype,
  // thinking), or null.
  busy: string | null;
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
  runs: (id: string) => VersionRun[] = () => [],
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
      things: board.things.map((thing) => ({
        id: thing.id,
        kind: thing.kind,
        agreed: thing.agreed,
        label: labelOf(thing, exploration.problem),
      })),
      links: board.links.map(({ from, to }) => ({ from, to })),
      line:
        exploration.status === "exploring"
          ? lineOf(board, talk(exploration.id))
          : null,
      busy: busyWith(talk(exploration.id), runs(exploration.id)),
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

// A thing's own words, short enough for the preview.
function labelOf(thing: Thing, problem: string): string {
  const words = (() => {
    switch (thing.kind) {
      case "problem":
        return problem;
      case "heard":
        return "What we heard";
      case "note":
        return thing.text;
      case "choice":
        return thing.title;
      case "prototype":
        return `${thing.key}: ${thing.name}`;
      case "diagram":
      case "picture":
        return thing.title;
    }
  })();
  const plain = plainWords(words);
  return plain.length > 60 ? `${plain.slice(0, 57).trimEnd()}…` : plain;
}

// Markdown's marks taken out (bold, code, headings, list bullets, a link's
// address), so a cut never leaves half a mark; one line.
export function plainWords(text: string): string {
  const lines = text.split("\n").map((line) => {
    const bare = line.trimStart();
    const start = ["#", "-", "*", "+", ">"].find((mark) =>
      bare.startsWith(`${mark} `),
    );
    return start ? bare.slice(bare.indexOf(" ") + 1) : bare.replace(/^#+ /, "");
  });
  return linksAsWords(lines.join(" "))
    .replaceAll("**", "")
    .replaceAll("__", "")
    .replaceAll("`", "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

// [words](address) → words.
function linksAsWords(text: string): string {
  let out = "";
  let at = 0;
  for (;;) {
    const middle = text.indexOf("](", at);
    const open = middle < 0 ? -1 : text.lastIndexOf("[", middle);
    const close = middle < 0 ? -1 : text.indexOf(")", middle);
    if (open < at || close < 0) return out + text.slice(at);
    out += text.slice(at, open) + text.slice(open + 1, middle);
    at = close + 1;
  }
}

// What the kobold is busy with in one exploration.
function busyWith(talk: TalkView, runs: VersionRun[]): string | null {
  const making = runs.find((run) => run.state === "making");
  if (making) return `Making prototype ${making.version}`;
  if (talk.writing !== null || talk.activity !== null) return "Thinking";
  return null;
}
