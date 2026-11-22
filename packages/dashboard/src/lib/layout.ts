// Lays things out with ELK (the same layout kernel as the setup canvas), in
// columns along their arrows: an exploration's board left to right, so each
// arrow leaves a box on its right and comes in on the left of the next; the
// System map too (top to bottom on a phone).

import { layoutKernel } from "@/lib/layout-kernel";

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
