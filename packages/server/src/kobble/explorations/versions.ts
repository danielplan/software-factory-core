// An exploration's prototypes and their variants: the prototype of a key,
// the prototype a choice leads to, whether an option has been made, free
// keys, branches, a variant added, and the address that shows a variant.
// A prototype holds its variants in its one copy of the code; which one
// shows is chosen outside the app, by the page address (?variant=B).

import type { Board } from "@software-factory/core";

import { Refused } from "../../refused.ts";
import { linked, type Option, nextLetter, withThing } from "./board-things.ts";

export type Made = Extract<Board["things"][number], { kind: "prototype" }>;

export function prototypeOf(board: Board, key: string): Made | null {
  for (const thing of board.things)
    if (thing.kind === "prototype" && thing.key === key) return thing;
  return null;
}

// The prototype a choice's arrow leads to, when it has one.
export function prototypeFor(board: Board, choice: string): Made | null {
  for (const link of board.links) {
    if (link.from !== choice) continue;
    const made = board.things.find((thing) => thing.id === link.to);
    if (made?.kind === "prototype") return made;
  }
  return null;
}

// Whether a choice's option has been made: a variant of the choice's
// prototype, or (on older boards) a prototype of its own, on an arrow
// labelled with the option.
export function madeFor(board: Board, choice: string, key: string): boolean {
  const made = prototypeFor(board, choice);
  if (made?.variants?.some((one) => one.key === key)) return true;
  return board.links.some(
    (link) =>
      link.from === choice &&
      link.label === key &&
      board.things.some(
        (thing) => thing.id === link.to && thing.kind === "prototype",
      ),
  );
}

// The option's letter, or with the first free number when another choice's
// option of that letter has a prototype (A2, A3 …).
export function freeKey(board: Board, key: string): string {
  for (let number = 1; ; number += 1) {
    const name = number === 1 ? key : `${key}${String(number)}`;
    if (!prototypeOf(board, name)) return name;
  }
}

export function prototypeBranch(exploration: string, key: string): string {
  return `proto/${exploration}-${key.toLowerCase()}`;
}

// A variant added to a prototype, under the next free letter (or the
// option's own letter when it is one).
export function withVariant(
  made: Made,
  way: { key?: string; name: string; difference: string },
): { made: Made; key: string } {
  const now = made.variants ?? [];
  if (now.length >= 4)
    throw new Refused(`Prototype ${made.key} has four variants already.`);
  const key = way.key ?? nextLetter(now.map((one) => one.key));
  const variant: Option = {
    key,
    name: way.name.trim(),
    difference: way.difference.trim(),
  };
  return { made: { ...made, variants: [...now, variant] }, key };
}

// The address that shows a prototype where the change is (the page it
// opens on), with the variant shown (?variant=).
export function shownAddress(url: string, made: Made | null): string {
  const address = new URL(made?.opens ?? "", url);
  if (made?.variant && (made.variants?.length ?? 0) > 1)
    address.searchParams.set("variant", made.variant);
  return address.toString();
}

// The page the maker said the change is on: its line "Opens at: #build".
export function opensIn(said: string): string | undefined {
  const line = said.split("\n").findLast((one) => one.includes("Opens at:"));
  const after = line?.slice(line.indexOf("Opens at:") + 9).trim() ?? "";
  const page = after.replaceAll(/[`*_]/g, "").trim().split(/\s/)[0] ?? "";
  return /^[/#?]/.test(page) ? page : undefined;
}

// A new variant's letter: after every option and variant the board has, so
// it is never taken for one of a choice's options.
export function freeVariant(board: Board, made: Made): string {
  const taken = [
    ...board.things.flatMap((one) =>
      one.kind === "choice" ? one.options.map((option) => option.key) : [],
    ),
    ...(made.variants ?? []).map((one) => one.key),
  ];
  return String.fromCharCode(
    Math.max(64, ...taken.map((key) => key.charCodeAt(0))) + 1,
  );
}

// A choice's options (all of them when none are named) as the variants of
// one prototype, joined to the choice by an arrow; when the choice has one
// with variants already, the options not made yet are added to it, and the
// maker is asked for them (`change`).
export function choicePrototype(
  board: Board,
  exploration: string,
  choice: string,
  keys: string[],
): { board: Board; key: string; change?: string } {
  const card = board.things.find((one) => one.id === choice);
  if (card?.kind !== "choice")
    throw new Refused(`There is no choice “${choice}” on the board.`);
  const options = (keys.length > 0 ? keys : card.options.map((o) => o.key))
    .map((key) => {
      const option = card.options.find((one) => one.key === key);
      if (!option) throw new Refused(`${choice} has no option ${key}.`);
      return option;
    })
    .filter((option) => !madeFor(board, choice, option.key));
  const [first] = options;
  if (!first)
    throw new Refused(
      keys.length === 1
        ? `Option ${keys.join("")} has a prototype already.`
        : "Those options have a prototype already.",
    );
  const letters = options.map((one) => one.key);
  // On older boards each option has a prototype of its own: so does a new one.
  const had = prototypeFor(board, choice);
  if (had?.variants) {
    let made = had;
    for (const option of options) made = withVariant(made, option).made;
    return {
      board: withThing(board, made),
      key: had.key,
      change: `Add the variants ${letters.join(", ")}, beside the ones it has.`,
    };
  }
  const key = freeKey(board, first.key);
  const id = `prototype-${key.toLowerCase()}`;
  const several = options.length > 1;
  const made: Made = {
    id,
    kind: "prototype",
    agreed: false,
    place: null,
    by: "person",
    key,
    name: several ? card.title : first.name,
    difference: several ? "" : first.difference,
    branch: prototypeBranch(exploration, key),
    tests: [],
    variants: options,
    variant: first.key,
  };
  return {
    board: linked(withThing(board, made), choice, id, letters.join(" · ")),
    key,
  };
}
