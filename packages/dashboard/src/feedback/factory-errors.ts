// The errors the factory catches while it runs, so they are not lost: what
// broke in this window (uncaught errors and refused promises), the last ten,
// to send with feedback. PROTOTYPE: two made-up errors from the factory's
// own work are there from the start, so the form has something to send.

import { useSyncExternalStore } from "react";

export type CaughtError = { at: string; text: string };

const KEEP = 10;

let caught: CaughtError[] = [
  {
    at: "10:42",
    text: "Made up: the builder stopped, git push was refused (exit 128)",
  },
  {
    at: "11:05",
    text: "Made up: TypeError: Cannot read properties of undefined (reading 'columns') at board-card.tsx",
  },
];
const listeners = new Set<() => void>();

function keep(text: string) {
  const at = new Date().toTimeString().slice(0, 5);
  caught = [...caught, { at, text: text.slice(0, 300) }].slice(-KEEP);
  for (const listener of listeners) listener();
}

window.addEventListener("error", (event) => {
  keep(event.message || "An error without a message");
});
window.addEventListener("unhandledrejection", (event) => {
  const reason: unknown = event.reason;
  keep(reason instanceof Error ? reason.message : String(reason));
});

export function useCaughtErrors(): CaughtError[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => caught,
  );
}
