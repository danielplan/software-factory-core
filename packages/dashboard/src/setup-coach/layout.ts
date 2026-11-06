// Arranges the canvas along its arrows, with ELK (the Eclipse Layout
// Kernel): each area a frame around its cards, steps flowing down, and the
// arrows routed around the cards rather than through them. The coach only
// says what goes on the canvas and what points to what.

import type { ELK, ElkNode } from "elkjs/lib/elk-api";

// ELK is large, so it is loaded with the first canvas.
let elk: Promise<ELK> | null = null;
function layoutKernel(): Promise<ELK> {
  elk ??= import("elkjs/lib/elk.bundled.js").then(
    ({ default: Kernel }) => new Kernel(),
  );
  return elk;
}

// The room between cards, set on the canvas and on each area (an area's
// cards are spaced by the area's own options). Between rows there is room
// for an arrow's label and the arrow itself.
const SPACING = {
  "elk.spacing.nodeNode": "28",
  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.componentComponent": "56",
};
const OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.edgeRouting": "ORTHOGONAL",
  ...SPACING,
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  // Arrows' bends in the canvas's own terms; cards inside their area.
  "elk.json.edgeCoords": "ROOT",
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

export async function arrange(
  boxes: Box[],
  arrows: { id: string; source: string; target: string }[],
): Promise<Arrangement> {
  const known = new Set(boxes.map((box) => box.id));
  const areas = [
    ...new Set(boxes.flatMap((box) => (box.area ? [box.area] : []))),
  ];
  const graph = await (
    await layoutKernel()
  ).layout({
    id: "canvas",
    layoutOptions: OPTIONS,
    children: [
      ...boxes
        .filter((box) => !box.area)
        .map(({ id, width, height }) => ({ id, width, height })),
      ...areas.map((area) => ({
        id: area,
        layoutOptions: { ...SPACING, "elk.padding": AREA_PADDING },
        children: boxes
          .filter((box) => box.area === area)
          .map(({ id, width, height }) => ({ id, width, height })),
      })),
    ],
    edges: arrows
      .filter((a) => known.has(a.source) && known.has(a.target))
      .map((a) => ({ id: a.id, sources: [a.source], targets: [a.target] })),
  });
  const places = new Map<string, Point>();
  const frames: Arrangement["frames"] = new Map();
  for (const child of graph.children ?? []) {
    const corner = { x: child.x ?? 0, y: child.y ?? 0 };
    if (areas.includes(child.id)) {
      frames.set(child.id, {
        ...corner,
        width: child.width ?? 0,
        height: child.height ?? 0,
      });
      for (const card of child.children ?? [])
        places.set(card.id, { x: card.x ?? 0, y: card.y ?? 0 });
    } else places.set(child.id, corner);
  }
  return { places, frames, routes: routesOf(graph) };
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
