import {
  BaseEdge,
  type EdgeProps,
  getSmoothStepPath,
  useInternalNode,
} from "@xyflow/react";

import type { RouteEdge } from "./canvas";
import type { Point } from "./layout";

// One of the coach's arrows: along the way the arrangement found around
// the cards, or, once the owner moved one of its cards, a plain one.
export function RouteEdgeView({
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  markerEnd,
}: EdgeProps<RouteEdge>) {
  const from = useInternalNode(source)?.internals.positionAbsolute;
  const to = useInternalNode(target)?.internals.positionAbsolute;
  const way =
    data?.points && near(from, data.from) && near(to, data.to)
      ? along(data.points)
      : getSmoothStepPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
          borderRadius: 10,
        });
  const [path, labelX, labelY] = way;
  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={{ fontSize: 12, fontWeight: 500 }}
      labelBgPadding={[8, 4]}
      labelBgBorderRadius={8}
    />
  );
}

function near(now: Point | undefined, then: Point | undefined): boolean {
  if (!now || !then) return false;
  return Math.abs(now.x - then.x) < 2 && Math.abs(now.y - then.y) < 2;
}

// The way through its points, with its label halfway along.
function along(points: Point[]): [string, number, number] {
  const path = points
    .map(
      (p, index) => `${index === 0 ? "M" : "L"} ${String(p.x)} ${String(p.y)}`,
    )
    .join(" ");
  const middle = Math.floor((points.length - 1) / 2);
  const a = points[middle] ?? { x: 0, y: 0 };
  const b = points[middle + 1] ?? a;
  return [path, (a.x + b.x) / 2, (a.y + b.y) / 2];
}
