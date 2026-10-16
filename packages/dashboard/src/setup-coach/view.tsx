import {
  ControlButton,
  type FitViewOptions,
  useReactFlow,
} from "@xyflow/react";
import { Maximize } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import type { Draft } from "@/api";

import { areaId, type PieceNode } from "./canvas";

// Where the view goes: to what the coach points the owner to, each time it
// points (once those cards are arranged), else, when cards came, to the
// whole canvas, never so small that the cards cannot be read.
export function useView(draft: Draft): (cards: number) => void {
  const { fitView, getNode } = useReactFlow<PieceNode>();
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
        void fitView({
          nodes: targets.map((id) => ({ id })),
          duration: 500,
          padding: clearOfPanels(),
          maxZoom: 1,
        });
      } else if (cards > shown.current.cards) {
        shown.current = { ...shown.current, cards };
        void fitView({
          duration: 400,
          padding: clearOfPanels(),
          minZoom: 0.7,
          maxZoom: 1,
        });
      }
    },
    [fitView, getNode],
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
  const { fitView } = useReactFlow<PieceNode>();
  return (
    <ControlButton
      title="Show the whole canvas"
      aria-label="Show the whole canvas"
      onClick={() => {
        void fitView({ duration: 300, padding: clearOfPanels(), maxZoom: 1 });
      }}
    >
      <Maximize aria-hidden />
    </ControlButton>
  );
}

// The room the coach takes, kept clear when the view fits the canvas: at
// the right on a wide window, below on a narrow one.
function clearOfPanels(): FitViewOptions["padding"] {
  const px = (n: number) => `${String(Math.round(n))}px` as `${number}px`;
  const wide = window.matchMedia("(min-width: 1024px)").matches;
  return wide
    ? { top: px(40), right: px(440), bottom: px(40), left: px(40) }
    : {
        top: px(24),
        right: px(24),
        bottom: px(window.innerHeight * 0.42 + 40),
        left: px(24),
      };
}
