// The board's things and arrows as the drawing library (React Flow) takes
// them: each thing a node, drawn at its kind's width, where a person put it
// or where the layout puts it; each arrow an edge with its short label, green
// into an agreed prototype. Plain rules, so they are checked.

import type { Edge, Node } from "@xyflow/react";

import type { ExplorationPage } from "../../api.ts";

export type Thing = ExplorationPage["board"]["things"][number];

export type ThingData = {
  thing: Thing;
  page: ExplorationPage;
  // The kobold points at it.
  pointed: boolean;
  // A person attached it to their next words.
  attached: boolean;
  // Placed by the layout (false until then: drawn invisibly, to be
  // measured first).
  placed: boolean;
};
export type ThingNode = Node<ThingData, Thing["kind"]>;

export function widthOf(thing: Thing): number {
  switch (thing.kind) {
    case "prototype":
      return 520;
    case "diagram":
      return 380;
    case "picture":
      return 300;
    case "choice":
      return 260;
    default:
      return 240;
  }
}

// What the layout depends on for one thing: its size (to the nearest few
// pixels) and whether a person placed it.
export function shapeOf(node: ThingNode): string {
  const round = (value: number | undefined) =>
    value === undefined ? -1 : Math.round(value / 8) * 8;
  return `${node.id}:${String(round(node.measured?.width))}x${String(round(node.measured?.height))}:${node.data.thing.place ? "fixed" : ""}`;
}

export function nodesOf(
  page: ExplorationPage,
  earlier: ThingNode[],
  marks: { pointed: string | null; attached: string[] },
): ThingNode[] {
  const before = new Map(earlier.map((node) => [node.id, node]));
  // The problem only once it is said: a new exploration opens on an
  // empty canvas.
  const drawn = page.board.things.filter(
    (thing) => !(thing.kind === "problem" && unsaid(page)),
  );
  return drawn.map((thing) => {
    const was = before.get(thing.id);
    return {
      id: thing.id,
      type: thing.kind,
      position: thing.place ?? was?.position ?? { x: 0, y: 0 },
      width: widthOf(thing),
      data: {
        thing,
        page,
        pointed: marks.pointed === thing.id,
        attached: marks.attached.includes(thing.id),
        placed: thing.place !== null || (was?.data.placed ?? false),
      },
      // What is inside takes the mouse; a thing is dragged by its bar.
      dragHandle: ".thing-handle",
      ...(was?.measured ? { measured: was.measured } : {}),
    };
  });
}

// The problem is not said yet and nothing points to or from it.
function unsaid(page: ExplorationPage): boolean {
  return (
    !page.exploration.problem &&
    !page.board.links.some(
      (link) => link.from === "problem" || link.to === "problem",
    )
  );
}

export function edgesOf(page: ExplorationPage): Edge[] {
  const agreed = new Set(
    page.board.things
      .filter((thing) => thing.kind === "prototype" && thing.agreed)
      .map((thing) => thing.id),
  );
  return page.board.links.map((link) => {
    const colour = agreed.has(link.to) ? "#12a594" : "#b6bccb";
    return {
      id: link.id,
      source: link.from,
      target: link.to,
      ...(link.label ? { label: link.label } : {}),
      style: { stroke: colour, strokeWidth: 1.5 },
      markerEnd: { type: "arrowclosed" as const, color: colour },
    };
  });
}

// A thing's name in a few words, for the chips of what is attached.
export function nameOf(thing: Thing): string {
  switch (thing.kind) {
    case "problem":
      return "The problem";
    case "heard":
      return "What we heard";
    case "note":
      return thing.text;
    case "prototype":
      return `${thing.key} · ${thing.name}`;
    default:
      return thing.title;
  }
}
