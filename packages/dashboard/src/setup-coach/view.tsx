import { ControlButton, useReactFlow, useStore } from "@xyflow/react";
import { Maximize } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import type { Draft } from "@/api";

import { areaId, type PieceNode } from "./canvas";

// Where the view goes: to what the coach points the owner to, each time it
// points (once those cards are arranged), else, when cards came, to the
// whole canvas, never so small that the cards cannot be read.
export function useView(draft: Draft): (cards: number) => void {
  const { getNode } = useReactFlow<PieceNode>();
  const fit = useFitClear();
  const shown = useRef({ cards: 0, n: 0 });
  const focus = useRef(draft.focus);
  useLayoutEffect(() => {
    focus.current = draft.focus;
  });
  const show = useCallback(
    (cards: number) => {
      const { ids, areas, n } = focus.current;
      const targets = [...ids, ...areas.map(areaId)].filter(
        (id) => getNode(id)?.data.placed,
      );
      if (n > shown.current.n && targets.length > 0) {
        shown.current = { cards, n };
        fit({ ids: targets, duration: 500, maxZoom: 1 });
      } else if (cards > shown.current.cards) {
        shown.current = { ...shown.current, cards };
        fit({ duration: 400, minZoom: 0.7, maxZoom: 1 });
      }
    },
    [fit, getNode],
  );
  // Pointed to cards already there: the view goes now.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      show(shown.current.cards);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [draft.focus.n, show]);
  return show;
}

// The whole canvas, clear of the coach: the view control's own button.
export function WholeCanvas() {
  const fit = useFitClear();
  return (
    <ControlButton
      title="Show the whole canvas"
      aria-label="Show the whole canvas"
      onClick={() => {
        fit({ duration: 300, maxZoom: 1 });
      }}
    >
      <Maximize aria-hidden />
    </ControlButton>
  );
}

type Fit = {
  // The pieces to show; all of them when none are named.
  ids?: string[];
  duration: number;
  minZoom?: number;
  maxZoom: number;
};

// The view fitting some pieces, centred in the room the coach leaves free
// (React Flow's own fit puts them against the far edge of that room).
function useFitClear(): (fit: Fit) => void {
  const { getNode, getNodes, setViewport } = useReactFlow<PieceNode>();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  return useCallback(
    ({ ids, duration, minZoom = 0.2, maxZoom }: Fit) => {
      const nodes = ids
        ? ids.flatMap((id) => {
            const node = getNode(id);
            return node ? [node] : [];
          })
        : getNodes();
      const bounds = boundsOf(nodes, getNode);
      if (bounds.width === 0 || bounds.height === 0) return;
      const room = freeRoom(width, height);
      const fits = Math.min(
        room.width / bounds.width,
        room.height / bounds.height,
      );
      const zoom = Math.min(maxZoom, Math.max(minZoom, fits));
      const x = room.left + (room.width - bounds.width * zoom) / 2;
      const y = room.top + (room.height - bounds.height * zoom) / 2;
      void setViewport(
        { x: x - bounds.x * zoom, y: y - bounds.y * zoom, zoom },
        { duration },
      );
    },
    [getNode, getNodes, setViewport, width, height],
  );
}

// The room the coach leaves free on the canvas: beside it on a wide window,
// above it on a narrow one, with a margin all round.
function freeRoom(width: number, height: number) {
  const wide = window.matchMedia("(min-width: 1024px)").matches;
  const margin = wide ? 40 : 24;
  const right = wide ? 440 : margin;
  const bottom = wide ? margin : height * 0.42 + 40;
  return {
    left: margin,
    top: margin,
    width: Math.max(1, width - margin - right),
    height: Math.max(1, height - margin - bottom),
  };
}

// The box around some pieces, from where they were put and the size they
// were given (React Flow's own measure of a frame lags behind for a moment
// after the canvas is arranged); a card in an area from the area's corner.
function boundsOf(
  nodes: PieceNode[],
  getNode: (id: string) => PieceNode | undefined,
) {
  const boxes = nodes.map((node) => {
    const parent = node.parentId ? getNode(node.parentId) : undefined;
    const x = node.position.x + (parent?.position.x ?? 0);
    const y = node.position.y + (parent?.position.y ?? 0);
    const width = node.width ?? node.measured?.width ?? 0;
    const height = node.height ?? node.measured?.height ?? 0;
    return { x, y, right: x + width, bottom: y + height };
  });
  if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((box) => box.right)) - x,
    height: Math.max(...boxes.map((box) => box.bottom)) - y,
  };
}
