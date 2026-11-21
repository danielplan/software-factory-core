// Prototype: errors the live app reports while the page is open, a made-up
// one every few seconds (variants B and C).

import { useEffect, useRef } from "react";

import { LATER_ERRORS } from "./made-up";

const EVERY = 8000;

export function useLiveErrors(onError: (title: string) => void): void {
  const heard = useRef(onError);
  heard.current = onError;
  useEffect(() => {
    let at = 0;
    const timer = setInterval(() => {
      const next = LATER_ERRORS[at];
      at += 1;
      if (next) heard.current(next.title);
      else clearInterval(timer);
    }, EVERY);
    return () => {
      clearInterval(timer);
    };
  }, []);
}
