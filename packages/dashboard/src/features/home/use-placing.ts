// Placing a block just added to Home: it follows the pointer, a drop line
// shows where it would go, and a click puts it down there. The keyboard does
// the same: ↑ and ↓ move the line, Enter places, Escape puts it away.

import { useEffect, useEffectEvent, useRef, useState } from "react";

export type Held = { id: string; x: number; y: number };

// How many blocks are above this height: where a block put down here goes.
function blocksAbove(y: number): number {
  let at = 0;
  for (const el of document.querySelectorAll<HTMLElement>("[data-block]")) {
    const box = el.getBoundingClientRect();
    if (box.top + box.height / 2 < y) at += 1;
  }
  return at;
}

type Listening = {
  put: () => void;
  cancel: () => void;
  pointer: (e: PointerEvent) => void;
  step: (by: -1 | 1) => void;
};

// Listens while a block is in hand; returns what stops listening.
function listen(on: Listening): () => void {
  const key = (e: KeyboardEvent) => {
    const act = {
      Escape: on.cancel,
      Enter: on.put,
      ArrowUp: () => {
        on.step(-1);
      },
      ArrowDown: () => {
        on.step(1);
      },
    }[e.key];
    if (!act) return;
    e.preventDefault();
    e.stopPropagation();
    act();
  };
  // The click that chose Add is over before the next one can place it.
  const later = setTimeout(() => {
    window.addEventListener("click", on.put);
  }, 0);
  window.addEventListener("pointermove", on.pointer);
  window.addEventListener("keydown", key, true);
  document.body.style.cursor = "grabbing";
  return () => {
    clearTimeout(later);
    window.removeEventListener("click", on.put);
    window.removeEventListener("pointermove", on.pointer);
    window.removeEventListener("keydown", key, true);
    document.body.style.cursor = "";
  };
}

export function usePlacing(
  // How many blocks Home shows: the line can be before any, or after the last.
  shown: number,
  onPlace: (id: string, at: number) => void,
  // Leaving arrange mode puts a block still in hand away.
  arranging: boolean,
) {
  const [held, setHeld] = useState<Held | null>(null);
  const [dropAt, setDropAt] = useState(0);
  const drop = useRef(0);
  const [was, setWas] = useState(arranging);
  if (was !== arranging) {
    setWas(arranging);
    if (!arranging) setHeld(null);
  }
  const id = held?.id ?? null;
  const put = useEffectEvent(() => {
    if (id) onPlace(id, drop.current);
    setHeld(null);
  });
  const moveTo = (at: number) => {
    drop.current = at;
    setDropAt(at);
  };
  const step = useEffectEvent((by: -1 | 1) => {
    moveTo(Math.max(0, Math.min(shown, drop.current + by)));
  });
  useEffect(() => {
    if (!id) return;
    return listen({
      put: () => {
        put();
      },
      cancel: () => {
        setHeld(null);
      },
      pointer: (e) => {
        setHeld((now) => (now ? { ...now, x: e.clientX, y: e.clientY } : now));
        moveTo(blocksAbove(e.clientY));
      },
      step: (by) => {
        step(by);
      },
    });
  }, [id]);
  return {
    held,
    dropAt,
    // Takes a block in hand: the line starts after the last block.
    pick: (block: string, x: number, y: number) => {
      moveTo(shown);
      setHeld({ id: block, x, y });
    },
  };
}
