// What the kobold and the people can do to a board, as one kind of
// request each (the kobold's tools and the page's buttons both come here),
// and what each did, in a line.

import type { Board, Thing } from "@software-factory/core";

import { Refused } from "../../refused.ts";
import {
  agreed,
  linked,
  newId,
  type Option,
  thingOf,
  unlinked,
  withOptions,
  withoutThing,
  withThing,
} from "./board-things.ts";

export type Act =
  | { act: "note"; text: string }
  | { act: "diagram"; title: string; diagram: string }
  | { act: "choice"; title: string; options: Partial<Option>[] }
  | {
      act: "change";
      id: string;
      text?: string;
      title?: string;
      diagram?: string;
      options?: Partial<Option>[];
      removeOptions?: string[];
    }
  | { act: "remove"; id: string }
  | { act: "link"; from: string; to: string; label?: string }
  | { act: "unlink"; from: string; to: string }
  | { act: "agree"; id: string; agreed: boolean }
  | { act: "choose"; id: string; option: string | null }
  | { act: "move"; id: string; x: number; y: number };

type By = Thing["by"];
type Done = { board: Board; said: string };

const fresh = (by: By) => ({ agreed: false, place: null, by });

function added(board: Board, thing: Thing): Done {
  return { board: withThing(board, thing), said: `Added ${thing.id}.` };
}

// The change to a thing's words, its diagram, or a choice's options.
type Change = Extract<Act, { act: "change" }>;

// A choice's options, changed: the ones to take off (not one with a
// prototype), then the ones added or changed.
function choiceOptions(board: Board, options: Option[], act: Change): Option[] {
  const off = act.removeOptions ?? [];
  if (
    board.things.some(
      (one) => one.kind === "prototype" && off.includes(one.key),
    )
  )
    throw new Refused("An option with a prototype stays.");
  return withOptions(
    options.filter((one) => !off.includes(one.key)),
    act.options ?? [],
  );
}

function changed(board: Board, act: Change): Done {
  const thing = thingOf(board, act.id);
  const next: Thing = { ...thing };
  if (next.kind === "note" && act.text) next.text = act.text.trim();
  if (
    (next.kind === "diagram" ||
      next.kind === "choice" ||
      next.kind === "picture") &&
    act.title
  )
    next.title = act.title.trim();
  if (next.kind === "diagram" && act.diagram) next.diagram = act.diagram;
  if (next.kind === "choice")
    next.options = choiceOptions(board, next.options, act);
  return { board: withThing(board, next), said: `Changed ${act.id}.` };
}

export function applyAct(board: Board, act: Act, by: By): Done {
  switch (act.act) {
    case "note":
      return added(board, {
        id: newId(board, "note"),
        kind: "note",
        ...fresh(by),
        text: act.text.trim(),
      });
    case "diagram":
      return added(board, {
        id: newId(board, "diagram"),
        kind: "diagram",
        ...fresh(by),
        title: act.title.trim(),
        diagram: act.diagram,
      });
    case "choice":
      return added(board, {
        id: newId(board, "choice"),
        kind: "choice",
        ...fresh(by),
        title: act.title.trim(),
        options: withOptions([], act.options),
        chosen: null,
      });
    case "change":
      return changed(board, act);
    case "remove":
      return { board: withoutThing(board, act.id), said: `Removed ${act.id}.` };
    case "link":
      return {
        board: linked(board, act.from, act.to, act.label?.trim() ?? ""),
        said: `Linked ${act.from} → ${act.to}.`,
      };
    case "unlink":
      return {
        board: unlinked(board, act.from, act.to),
        said: `Unlinked ${act.from} → ${act.to}.`,
      };
    case "agree":
      return {
        board: agreed(board, act.id, act.agreed),
        said: `${act.id} is ${act.agreed ? "agreed" : "a sketch"}.`,
      };
    default:
      return placedOrChosen(board, act);
  }
}

function placedOrChosen(
  board: Board,
  act: Extract<Act, { act: "choose" | "move" }>,
): Done {
  const thing = thingOf(board, act.id);
  if (act.act === "move")
    return {
      board: withThing(board, { ...thing, place: { x: act.x, y: act.y } }),
      said: `Moved ${act.id}.`,
    };
  if (thing.kind !== "choice") throw new Refused(`${act.id} is not a choice.`);
  if (act.option && !thing.options.some((one) => one.key === act.option))
    throw new Refused(`${act.id} has no option ${act.option}.`);
  return {
    board: withThing(board, { ...thing, chosen: act.option }),
    said: act.option
      ? `Chose ${act.option} on ${act.id}.`
      : `Took back the choice on ${act.id}.`,
  };
}

// What a person did, in words the kobold hears with their next message.
export function personWords(act: Act, board: Board): string {
  const name = (id: string) => {
    const thing = board.things.find((one) => one.id === id);
    return thing ? `${thing.kind} ${id}` : id;
  };
  switch (act.act) {
    case "agree":
      return `marked ${name(act.id)} ${act.agreed ? "agreed" : "a sketch"}`;
    case "choose":
      return act.option
        ? `chose ${act.option} on ${name(act.id)}`
        : `took back the choice on ${name(act.id)}`;
    case "move":
      return `moved ${name(act.id)}`;
    case "remove":
      return `removed ${act.id}`;
    default:
      return `changed ${act.act === "change" ? name(act.id) : "the board"}`;
  }
}
