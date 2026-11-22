// The errors the factory catches while it runs, so they are not lost: what
// broke in this window (uncaught errors and refused promises), the last ten,
// to send with feedback. The newest one not yet reported or put away is
// "fresh": the sidebar offers to report it.

import { useSyncExternalStore } from "react";

export type CaughtError = { id: number; at: string; text: string };

const KEEP = 10;

let next = 1;
let caught: CaughtError[] = [];
let fresh: number | null = null;
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
    fresh === null ? null : (caught.find((one) => one.id === fresh) ?? null),
  );
}
