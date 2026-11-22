// Things that change place move there smoothly (FLIP: measure before and
// after, then slide from where they were). A thing marked data-flip="<id>"
// inside the element is followed by its id, even when it moves to another
// parent. With `enter`, a thing that was not there before fades in. Off when
// the person prefers reduced motion. Plain Web Animations, nothing to add.

import { type RefObject, useLayoutEffect, useRef } from "react";

// Where an element is on the page, from its layout alone: not moved by a
// scroll, nor by a transform that is still running.
function placeOf(el: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

export function useFlip(
  ref: RefObject<HTMLElement | null>,
  enter = false,
): void {
  const before = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const now = new Map<string, { x: number; y: number }>();
    for (const el of root.querySelectorAll<HTMLElement>("[data-flip]")) {
      const id = el.dataset.flip ?? "";
      const at = placeOf(el);
      now.set(id, at);
      if (calm) continue;
      const was = before.current.get(id);
      if (was) {
        const dx = was.x - at.x;
        const dy = was.y - at.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1)
          el.animate(
            [{ transform: `translate(${String(dx)}px, ${String(dy)}px)` }, { transform: "none" }],
            { duration: 220, easing: "ease-out" },
          );
      } else if (enter && before.current.size > 0) {
        el.animate(
          [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 200, easing: "ease-out" },
        );
      }
    }
    before.current = now;
  });
}
