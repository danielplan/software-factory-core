// The errors the factory catches while it runs, so they are not lost: what
// broke in this window (uncaught errors and refused promises), the last ten,
// to send with feedback. The newest one not yet reported or put away is
// "fresh": the sidebar offers to report it. PROTOTYPE: two made-up errors
// from the factory's own work are there from the start, the second fresh,
// so the notice and the form have something to show.

import { useSyncExternalStore } from "react";

export type CaughtError = { id: number; at: string; text: string };

const KEEP = 10;

let next = 3;
let caught: CaughtError[] = [
  {
    id: 1,
    at: "10:42",
    text: "Made up: TypeError: Cannot read properties of undefined (reading 'columns') at board-card.tsx:88",
  },
  {
    id: 2,
    at: "11:05",
    text: "Made up: the builder stopped: git push to github.com/made-up-team/shop refused (exit 128) for card “Refunds for Maria Rossi's order 4471”",
  },
];
let fresh: number | null = 2;
const listeners = new Set<() => void>();

function tell() {
  for (const listener of listeners) listener();
}

function keep(text: string) {
  const at = new Date().toTimeString().slice(0, 5);
  const id = next++;
  caught = [...caught, { id, at, text: text.slice(0, 300) }].slice(-KEEP);
  fresh = id;
  tell();
}

window.addEventListener("error", (event) => {
  keep(event.message || "An error without a message");
});
window.addEventListener("unhandledrejection", (event) => {
  const reason: unknown = event.reason;
  keep(reason instanceof Error ? reason.message : String(reason));
});

// The notice is put away (reported, or not wanted).
export function putAway() {
  fresh = null;
  tell();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCaughtErrors(): CaughtError[] {
  return useSyncExternalStore(subscribe, () => caught);
}

export function useFreshError(): CaughtError | null {
  return useSyncExternalStore(subscribe, () =>
    fresh == null ? null : (caught.find((one) => one.id === fresh) ?? null),
  );
}
