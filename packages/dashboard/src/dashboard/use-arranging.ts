// What the person does to Home's blocks while arranging: move, hide, drag
// one onto another, or put down a block just added. Each change is counted,
// so the blocks move only because of what the person did.

import { useEffect, useState } from "react";

import {
  hide,
  type Layout,
  moveBefore,
  placeAt,
  shownOf,
} from "@/lib/home-layout";

import { usePlacing } from "./use-placing";

// A block just placed is scrolled into view.
function useScrolledTo(id: string | null) {
  useEffect(() => {
    if (!id) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      document.querySelector(`[data-block="${id}"]`)?.scrollIntoView({
        behavior: calm ? "auto" : "smooth",
        block: "nearest",
      });
    });
  }, [id]);
}

// Dragging a block onto another puts it before that one.
function useDragging(onDrop: (id: string, before: string) => void) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const end = () => {
    setDragging(null);
    setOver(null);
  };
  return {
    dragging,
    over,
    start: setDragging,
    end,
    enter: setOver,
    drop: (target: string) => {
      if (dragging) onDrop(dragging, target);
      end();
    },
  };
}

export type Dragging = ReturnType<typeof useDragging>;

export function useArranging(
  layout: Layout,
  onChange: (layout: Layout) => void,
  // The blocks of installed extensions that the page can draw.
  offered: Set<string>,
  editing: boolean,
) {
  const [act, setAct] = useState(0);
  const change = (next: Layout) => {
    setAct((n) => n + 1);
    onChange(next);
  };
  // A hidden block collapses away before it goes; a placed one gets a ring
  // that fades.
  const [leaving, setLeaving] = useState<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const shown = shownOf(layout, offered);
  const placing = usePlacing(
    shown.length,
    (id, at) => {
      change(placeAt(layout, id, at, offered));
      setLit(id);
      setTimeout(() => {
        setLit(null);
      }, 1500);
    },
    editing,
  );
  useScrolledTo(lit);
  const drag = useDragging((id, target) => {
    change({ ...layout, order: moveBefore(layout.order, id, target) });
  });
  return {
    act,
    change,
    shown,
    leaving,
    lit,
    drag,
    ...placing,
    remove: (id: string) => {
      setLeaving(id);
      setTimeout(() => {
        change(hide(layout, id));
        setLeaving(null);
      }, 200);
    },
  };
}
