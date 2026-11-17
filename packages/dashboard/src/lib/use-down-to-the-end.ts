// Something that reaches down to the end of the page (the Build board's
// columns, the Product map), never lower than 60% of the window. Only where
// it starts is measured, in the page's layout (offsetTop, which the page's
// arrival animation does not move); the window's height and what lies below
// it (the page's padding and the frame, given as a CSS length) are left to
// CSS. It is measured again whenever the page changes size, so the top bar
// filling in, or a line appearing above it, is followed.

import { useLayoutEffect, useRef, useState } from "react";

export function useDownToTheEnd(below: string) {
  const element = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const fit = () => {
      let at = 0;
      for (
        let one: HTMLElement | null = element.current;
        one;
        one = one.offsetParent as HTMLElement | null
      )
        at += one.offsetTop;
      setTop(Math.round(at));
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(document.body);
    if (element.current?.parentElement)
      watch.observe(element.current.parentElement);
    return () => {
      watch.disconnect();
    };
  }, []);
  const height = `max(60vh, calc(100dvh - ${String(top)}px - ${below}))`;
  return [element, height] as const;
}
