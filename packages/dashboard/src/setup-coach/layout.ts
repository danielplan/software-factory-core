// Arranges the canvas along its arrows, with ELK (the Eclipse Layout
// Kernel): each area a frame around its cards, steps flowing down, and the
// arrows routed around the cards rather than through them. Each area is laid
// out on its own, then the areas (and cards outside any) together; so cards
// and areas that no arrow joins are packed in rows, not strung out in one
// line. The coach only says what goes on the canvas and what points to what.

import type { ELK, ElkNode } from "elkjs/lib/elk-api";

// ELK is large, so it is loaded with the first canvas.
let elk: Promise<ELK> | null = null;
function layoutKernel(): Promise<ELK> {
  elk ??= import("elkjs/lib/elk.bundled.js").then(
    ({ default: Kernel }) => new Kernel(),
  );
  return elk;
}

// The room between cards. Between rows there is room for an arrow's label
// and the arrow itself. What no arrow joins is packed in rows, about this
// much wider than tall (the room beside the coach).
const OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.spacing.nodeNode": "28",
  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.componentComponent": "40",
  "elk.separateConnectedComponents": "true",
  "elk.aspectRatio": "1.6",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  // Cards and areas in the order the coach drew them, where nothing else
  // decides: the first comes first.
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.considerModelOrder.components": "MODEL_ORDER",
};
// Room in an area's frame for its title.
const AREA_PADDING = "[top=44,left=16,bottom=16,right=16]";

export type Box = {
  id: string;
  // The area it is framed in, if any.
  area?: string;
  width: number;
  height: number;
};
export type Point = { x: number; y: number };
export type Arrangement = {
  // Each box's top left corner, inside its area's frame if it has one.
  places: Map<string, Point>;
  // Each area's frame.
  frames: Map<string, { x: number; y: number; width: number; height: number }>;
  // Each arrow's way, from start to end, in the canvas's own terms.
  routes: Map<string, Point[]>;
};

type Arrow = { id: string; source: string; target: string };

export async function arrange(
  boxes: Box[],
  arrows: Arrow[],
): Promise<Arrangement> {
  const kernel = await layoutKernel();
  const known = new Map(boxes.map((box) => [box.id, box.area]));
  const joined = arrows.filter(
    (a) => known.has(a.source) && known.has(a.target),
  );
  const areas = [
    ...new Set(boxes.flatMap((box) => (box.area ? [box.area] : []))),
  ];
  // Each area on its own: its cards, and the arrows between them.
  const inside: ElkNode[] = await Promise.all(
    areas.map((area) =>
      kernel.layout({
        id: area,
        layoutOptions: { ...OPTIONS, "elk.padding": AREA_PADDING },
        children: boxes
          .filter((box) => box.area === area)
          .map(({ id, width, height }) => ({ id, width, height })),
        edges: elkEdges(
          joined.filter(
            (a) => known.get(a.source) === area && known.get(a.target) === area,
          ),
        ),
      }),
    ),
  );
  // Then the areas, as boxes of their size, with the cards outside any;
  // an arrow from one area to another joins the two areas.
  const holder = (id: string) => known.get(id) ?? id;
  const across = joined.filter(
    (a) => holder(a.source) !== holder(a.target) || !known.get(a.source),
  );
  const canvas = await kernel.layout({
    id: "canvas",
    layoutOptions: OPTIONS,
    children: [
      ...boxes
        .filter((box) => !box.area)
        .map(({ id, width, height }) => ({ id, width, height })),
      ...inside.map((area) => ({
        id: area.id,
        width: area.width ?? 0,
        height: area.height ?? 0,
      })),
    ],
    edges: elkEdges(
      across.map((a) => ({
        id: a.id,
        source: holder(a.source),
        target: holder(a.target),
      })),
    ),
  });
  return arrangement(canvas, inside, new Set(areas));
}

function elkEdges(arrows: Arrow[]) {
  return arrows
    .filter((a) => a.source !== a.target)
    .map((a) => ({ id: a.id, sources: [a.source], targets: [a.target] }));
}

// Where everything went: cards inside their area's frame, the frames and
// loose cards on the canvas, and the arrows inside an area moved with it
// (an arrow between areas has no way of its own: it is drawn plainly).
function arrangement(
  canvas: ElkNode,
  inside: ElkNode[],
  areas: Set<string>,
): Arrangement {
  const done: Arrangement = {
    places: new Map(),
    frames: new Map(),
    routes: new Map(),
  };
  for (const child of canvas.children ?? []) {
    const area = inside.find((one) => one.id === child.id);
    if (area) placeArea(done, child, area);
    else done.places.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  for (const [id, way] of routesOf(canvas))
    if (!done.routes.has(id) && !across(id, canvas, areas))
      done.routes.set(id, way);
  return done;
}

// An area's frame where the canvas put it, its cards inside it, and its
// arrows moved with it.
function placeArea(done: Arrangement, at: ElkNode, area: ElkNode): void {
  const x = at.x ?? 0;
  const y = at.y ?? 0;
  done.frames.set(at.id, {
    x,
    y,
    width: at.width ?? 0,
    height: at.height ?? 0,
  });
  for (const card of area.children ?? [])
    done.places.set(card.id, { x: card.x ?? 0, y: card.y ?? 0 });
  for (const [id, way] of routesOf(area))
    done.routes.set(
      id,
      way.map((p) => ({ x: p.x + x, y: p.y + y })),
    );
}

// Whether an arrow on the canvas joins an area: its way ends at the
// area's edge, not at the card, so it is drawn plainly instead.
function across(id: string, canvas: ElkNode, areas: Set<string>): boolean {
  const edge = (canvas.edges ?? []).find((e) => e.id === id);
  return [...(edge?.sources ?? []), ...(edge?.targets ?? [])].some((end) =>
    areas.has(end),
  );
}

function routesOf(graph: ElkNode): Map<string, Point[]> {
  return new Map(
    (graph.edges ?? []).flatMap((edge) => {
      const [section] = edge.sections ?? [];
      if (!section) return [];
      return [
        [
          edge.id,
          [section.startPoint, ...(section.bendPoints ?? []), section.endPoint],
        ],
      ];
    }),
  );
}
