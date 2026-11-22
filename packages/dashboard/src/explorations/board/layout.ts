// Lays things out with ELK (the same layout kernel as the setup canvas): the
// System map in columns along its arrows (top to bottom on a phone), and an
// exploration's board as a whiteboard, spread in two directions with things
// that belong together near each other, never in a row.

import { layoutKernel } from "@/setup-coach/layout";

const OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.spacing.nodeNode": "40",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.spacing.componentComponent": "56",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
};

export type Box = { id: string; width: number; height: number };

// Which way the arrows run: left to right, or top to bottom.
export type Direction = "RIGHT" | "DOWN";

// Where each box's top left corner goes.
export async function arrange(
  boxes: Box[],
  arrows: { id: string; source: string; target: string }[],
  direction: Direction = "RIGHT",
): Promise<Map<string, { x: number; y: number }>> {
  const known = new Set(boxes.map((box) => box.id));
  const graph = await (
    await layoutKernel()
  ).layout({
    id: "board",
    layoutOptions: { ...OPTIONS, "elk.direction": direction },
    children: boxes.map((box) => ({ ...box })),
    edges: arrows
      .filter((a) => known.has(a.source) && known.has(a.target))
      .map((a) => ({ id: a.id, sources: [a.source], targets: [a.target] })),
  });
  return new Map(
    (graph.children ?? []).map((child) => [
      child.id,
      { x: child.x ?? 0, y: child.y ?? 0 },
    ]),
  );
}

const APART = { "elk.algorithm": "sporeOverlap", "elk.spacing.nodeNode": "56" };

// A whiteboard: things joined by an arrow near each other, the rest around
// them, none overlapping; things a person placed stay where they are and the
// others go around them.
export async function spread(
  boxes: (Box & { place?: { x: number; y: number } })[],
  arrows: { id: string; source: string; target: string }[],
  // How far apart things joined by an arrow are (smaller for the board in
  // small).
  apartBy = 360,
): Promise<Map<string, { x: number; y: number }>> {
  const known = new Set(boxes.map((box) => box.id));
  const kernel = await layoutKernel();
  const near = await kernel.layout({
    id: "board",
    layoutOptions: {
      "elk.algorithm": "stress",
      "elk.stress.desiredEdgeLength": String(apartBy),
    },
    children: boxes.map(({ place, ...box }) => ({
      ...box,
      ...(place
        ? { ...place, layoutOptions: { "elk.stress.fixed": "true" } }
        : {}),
    })),
    edges: arrows
      .filter((a) => known.has(a.source) && known.has(a.target))
      .map((a) => ({ id: a.id, sources: [a.source], targets: [a.target] })),
  });
  const apart = await kernel.layout({ ...near, layoutOptions: APART });
  return new Map(
    (apart.children ?? []).map((child) => [
      child.id,
      { x: child.x ?? 0, y: child.y ?? 0 },
    ]),
  );
}
