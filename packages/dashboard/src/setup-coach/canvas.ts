// The setup map as the drawing library (React Flow) takes it: each area the
// coach draws in as a frame around its cards, cards without an area on
// their own, and the coach's arrows between cards, along the ways the
// arrangement found for them (layout.ts).

import { type Edge, MarkerType, type Node } from "@xyflow/react";
import { createContext } from "react";

import type { Draft } from "@/api";

import type { Point } from "./layout";

// The owner's change to the canvas, sent to the server (setup-canvas.tsx).
export const CanvasChange = createContext<(body: unknown) => void>(() => {});

// What one node on the canvas shows.
export type Piece =
  | { kind: "area"; title: string }
  | { kind: "card"; card: Draft["cards"][number] };

export type PieceData = {
  piece: Piece;
  // The owner attached it to their next message.
  attached: boolean;
  // The coach points the owner to it.
  focused: boolean;
  // Placed: by the owner, or by the arrangement (until then it is drawn
  // invisibly, to be measured).
  placed: boolean;
};
export type PieceNode = Node<PieceData>;

// An arrow's way, found by the arrangement, and where its two cards were
// then: once one moves, the way no longer fits and a plain one is drawn.
export type RouteData = {
  points?: Point[];
  from?: Point;
  to?: Point;
};
export type RouteEdge = Edge<RouteData, "route">;

export const areaId = (title: string) => `area:${title}`;

function piecesOf(
  draft: Draft,
): { id: string; piece: Piece; parent?: string }[] {
  const areas = [
    ...new Set(draft.cards.flatMap((card) => (card.area ? [card.area] : []))),
  ];
  return [
    ...draft.cards
      .filter((card) => !card.area)
      .map((card) => ({ id: card.id, piece: { kind: "card" as const, card } })),
    // A frame comes before its cards, as the drawing library needs.
    ...areas.flatMap((title) => [
      { id: areaId(title), piece: { kind: "area" as const, title } },
      ...draft.cards
        .filter((card) => card.area === title)
        .map((card) => ({
          id: card.id,
          piece: { kind: "card" as const, card },
          parent: areaId(title),
        })),
    ]),
  ];
}

// The nodes, keeping where and how big the earlier ones were drawn. A
// card's place is inside its area's frame.
export function nodesOf(
  draft: Draft,
  earlier: PieceNode[],
  attached: string[],
): PieceNode[] {
  const before = new Map(earlier.map((node) => [node.id, node]));
  const focused = new Set([
    ...draft.focus.ids,
    ...draft.focus.areas.map(areaId),
  ]);
  return piecesOf(draft).map(({ id, piece, parent }) => {
    const was = before.get(id);
    const place = draft.places[id];
    return {
      id,
      type: "piece",
      position: place ?? was?.position ?? { x: 0, y: 0 },
      data: {
        piece,
        attached: attached.includes(id),
        focused: focused.has(id),
        placed: place !== undefined || (was?.data.placed ?? false),
      },
      dragHandle: ".piece-handle",
      ...(parent ? { parentId: parent } : {}),
      ...(piece.kind === "area" ? frameOf(was) : {}),
      ...(was?.measured ? { measured: was.measured } : {}),
    };
  });
}

// An area's frame: behind its cards, not picked, as big as last arranged.
function frameOf(was: PieceNode | undefined): Partial<PieceNode> {
  return {
    selectable: false,
    zIndex: -1,
    ...(was?.width ? { width: was.width, height: was.height } : {}),
  };
}

// The coach's arrows, each along its way if it has one.
export function edgesOf(
  draft: Draft,
  routes: Map<string, Point[]>,
  at: Map<string, Point>,
): RouteEdge[] {
  return draft.links.map((link) => {
    const points = routes.get(link.id);
    const from = at.get(link.from);
    const to = at.get(link.to);
    return {
      id: link.id,
      type: "route",
      source: link.from,
      target: link.to,
      ...(link.label ? { label: link.label } : {}),
      markerEnd: { type: MarkerType.ArrowClosed },
      data: points && from && to ? { points, from, to } : {},
    };
  });
}

// The pieces the owner attached to their next message, by name, in the
// order they picked them; ones no longer on the canvas are left out.
export function attachedNames(
  draft: Draft,
  ids: string[],
): { id: string; name: string }[] {
  const pieces = new Map(piecesOf(draft).map((p) => [p.id, p.piece]));
  return ids.flatMap((id) => {
    const piece = pieces.get(id);
    return piece ? [{ id, name: nameOf(piece) }] : [];
  });
}

// A piece's name in a few words, for "(About: …)" in the owner's message.
function nameOf(piece: Piece): string {
  return piece.kind === "area" ? piece.title : piece.card.title;
}

// What the arrangement depends on: which cards and their sizes (to the
// nearest few pixels), and the arrows. A frame's size follows its cards.
export function shapeOf(nodes: PieceNode[], draft: Draft): string {
  const size = (value: number | undefined) =>
    value === undefined ? -1 : Math.round(value / 8);
  return [
    ...nodes
      .filter((n) => n.data.piece.kind !== "area")
      .map(
        (n) =>
          `${n.id}@${n.parentId ?? ""}:${String(size(n.measured?.width))}x${String(size(n.measured?.height))}`,
      ),
    ...draft.links.map((l) => `${l.from}>${l.to}`),
  ].join("|");
}
