// The things on an exploration's board and the arrows between them: what
// the kobold and the people do to them (add, change, remove, link, unlink,
// agree, choose an option, move), checked so that what does not fit is
// said plainly, and the board in short lines as the kobold reads it.

import type {
  Board,
  BoardLink,
  Exploration,
  Thing,
} from "@software-factory/core";

import { Refused } from "../../refused.ts";

export type Option = { key: string; name: string; difference: string };

// A new id for a thing of this kind: note-1, note-2…
export function newId(board: Board, kind: string): string {
  const taken = new Set([
    ...board.things.map((one) => one.id),
    ...board.links.map((one) => one.id),
  ]);
  let n = 1;
  while (taken.has(`${kind}-${String(n)}`)) n += 1;
  return `${kind}-${String(n)}`;
}

export function thingOf(board: Board, id: string): Thing {
  const thing = board.things.find((one) => one.id === id);
  if (!thing) throw new Refused(`There is no thing “${id}” on the board.`);
  return thing;
}

export function withThing(board: Board, thing: Thing): Board {
  const at = board.things.findIndex((one) => one.id === thing.id);
  return {
    ...board,
    things: at >= 0 ? board.things.with(at, thing) : [...board.things, thing],
  };
}

export function withoutThing(board: Board, id: string): Board {
  const thing = thingOf(board, id);
  if (thing.kind === "problem")
    throw new Refused("The problem stays on the board: change its words.");
  // A prototype the team did not agree on can go (a broken first version
  // is in nobody's way then); the agreed one is what is built, so it
  // stays until the agreement is taken back. Its branch stays either way.
  if (thing.kind === "prototype" && thing.agreed)
    throw new Refused(
      `Prototype ${thing.key} is agreed: mark it a sketch first, once the team says it is not to be built.`,
    );
  return {
    // A card takes its marks with it.
    things: board.things.filter(
      (one) => one.id !== id && !(one.kind === "mark" && one.on === id),
    ),
    links: board.links.filter((one) => one.from !== id && one.to !== id),
  };
}

export function linked(
  board: Board,
  from: string,
  to: string,
  label = "",
): Board {
  thingOf(board, from);
  thingOf(board, to);
  if (from === to) throw new Refused("An arrow joins two different things.");
  const others = board.links.filter(
    (one) => !(one.from === from && one.to === to),
  );
  const link: BoardLink = { id: newId(board, "link"), from, to, label };
  return { ...board, links: [...others, link] };
}

export function unlinked(board: Board, from: string, to: string): Board {
  const links = board.links.filter(
    (one) => !(one.from === from && one.to === to),
  );
  if (links.length === board.links.length)
    throw new Refused(`There is no arrow from ${from} to ${to}.`);
  return { ...board, links };
}

// Options added (the next free letter) or changed (by their letter).
export function withOptions(options: Option[], changes: Partial<Option>[]) {
  let now = [...options];
  for (const change of changes) now = withOption(now, change);
  return now.toSorted((a, b) => a.key.localeCompare(b.key));
}

function withOption(now: Option[], change: Partial<Option>): Option[] {
  const key = change.key?.trim().toUpperCase() ?? "";
  const at = now.findIndex((one) => one.key === key);
  const before = now[at];
  if (!before) {
    const name = change.name?.trim();
    if (!name) throw new Refused("A new option needs a name.");
    const fresh = { name, difference: change.difference?.trim() ?? "" };
    return [...now, { key: nextLetter(now.map((one) => one.key)), ...fresh }];
  }
  return now.with(at, {
    key,
    name: change.name?.trim() || before.name,
    difference: change.difference?.trim() ?? before.difference,
  });
}

export function nextLetter(taken: string[]): string {
  for (let at = 0; at < 26; at++) {
    const letter = String.fromCharCode(65 + at);
    if (!taken.includes(letter)) return letter;
  }
  throw new Refused("There are 26 options already.");
}

// Agreed or a sketch again. One prototype at most is agreed: agreeing to
// one makes the others sketches.
export function agreed(board: Board, id: string, now: boolean): Board {
  const thing = thingOf(board, id);
  return {
    ...board,
    things: board.things.map((one) => {
      if (one.id === id) return { ...one, agreed: now };
      if (now && thing.kind === "prototype" && one.kind === "prototype")
        return { ...one, agreed: false };
      return one;
    }),
  };
}

// The problem, and what we heard when the exploration has signals, are on
// every board; the problem points to the first choice when nothing else
// does.
export function completed(exploration: Exploration, board: Board): Board {
  const fixed: Thing[] = [];
  const fresh = { agreed: false, place: null, by: "kobold" as const };
  if (!board.things.some((one) => one.kind === "problem"))
    fixed.push({ id: "problem", kind: "problem", ...fresh });
  if (
    exploration.heard.length > 0 &&
    !board.things.some((one) => one.kind === "heard")
  )
    fixed.push({ id: "heard", kind: "heard", ...fresh });
  return { ...board, things: [...fixed, ...board.things] };
}

// A picture's file, as the kobold is told to read it.
const seeing = (exploration: Exploration, file: string) =>
  `read factory/kobble/explorations/${exploration.id}/pictures/${file} to see it`;

// What the team's marks on a card come to for the kobold: how many, and the
// card as last drawn.
function markLine(
  head: string,
  marks: Extract<Thing, { kind: "mark" }>[],
  exploration: Exploration,
): string {
  const image = marks.findLast((one) => one.image)?.image;
  const count = `${String(marks.length)} pen mark${marks.length === 1 ? "" : "s"} on ${marks[0]?.on ?? ""}`;
  return `${head}: ${count}${image ? ` (${seeing(exploration, image)}: the marks alone, drawn at the card's size and place)` : ""}`;
}

function line(
  thing: Thing,
  exploration: Exploration,
  all: Thing[] = [],
): string {
  const state = thing.agreed ? "agreed" : "sketch";
  const whose = thing.by === "person" ? ", the team's own" : "";
  const head = `- ${thing.id} (${thing.kind}, ${state}${whose})`;
  switch (thing.kind) {
    case "problem":
      return `${head}: ${exploration.problem || "not said yet"}`;
    case "heard":
      return `${head}: ${exploration.heard.map((one) => one.text).join(" / ")}`;
    case "note":
      return `${head}: ${thing.text}`;
    case "choice":
      return [
        `${head}: ${thing.title}${thing.chosen ? " (chosen: " + thing.chosen + ")" : ""}`,
        ...thing.options.map(
          (o) =>
            `    ${o.key}. ${o.name}: ${o.difference || "—"}${o.key === thing.recommended ? " (you recommend it)" : ""}`,
        ),
      ].join("\n");
    case "prototype":
      return `${head}: ${thing.key} · ${thing.name}, on ${thing.branch}${versionWords(thing)}`;
    case "diagram":
      return `${head}: ${thing.title}`;
    case "picture":
      return `${head}: ${thing.title} (${seeing(exploration, thing.image)})`;
    case "link":
      return `${head}: ${thing.title}, on ${thing.site}, ${thing.url}${thing.preview ? ` (its preview: ${seeing(exploration, thing.preview)})` : ""}`;
    case "sketch":
      return `${head}: a drawing${thing.image ? ` (${seeing(exploration, thing.image)})` : ""}`;
    case "mark":
      return markLine(
        head,
        all.filter(
          (one): one is typeof thing =>
            one.kind === "mark" && one.on === thing.on,
        ),
        exploration,
      );
  }
}

// A prototype's variants, and the one the team looks at.
function versionWords(made: Extract<Thing, { kind: "prototype" }>): string {
  const variants = made.variants ?? [];
  if (variants.length < 2) return "";
  const lines = variants.map(
    (one) =>
      `    ${one.key}. ${one.name}: ${one.difference || "—"}${one.key === made.variant ? " (shown)" : ""}`,
  );
  return ["; variants:", ...lines].join("\n");
}

// A sketch card's marks are told with the card, and the marks on any other
// card in one line (the first of them).
function hidden(thing: Thing, at: number, things: Thing[]): boolean {
  if (thing.kind !== "mark") return false;
  const card = things.find((one) => one.id === thing.on);
  if (card?.kind === "sketch") return true;
  return (
    things.findIndex((one) => one.kind === "mark" && one.on === thing.on) !== at
  );
}

// The board in short lines, as the kobold reads it.
export function boardText(exploration: Exploration, board: Board): string {
  const full = completed(exploration, board);
  return [
    `${exploration.id} · ${exploration.title} (${exploration.status})`,
    "Things:",
    ...full.things
      .filter((thing, at) => !hidden(thing, at, full.things))
      .map((thing) => line(thing, exploration, full.things)),
    "Arrows:",
    ...full.links.map(
      (one) =>
        `- ${one.from} → ${one.to}${one.label ? " (" + one.label + ")" : ""}`,
    ),
  ].join("\n");
}
