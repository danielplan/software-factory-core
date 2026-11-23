// Prototype only: whether the made-up explorer has stopped (state "stopped"), shared by the board's reading card and the made-up page, so the
// conversation beside the board says the same as the board. Each new try
// stops with the other reason, so both can be seen.

import { useSyncExternalStore } from "react";

import { stateAsked } from "./prototype-switch";

const REASONS = [
  "Claude Code is not signed in",
  "The explorer stopped: no reason given",
];

// The made-up explorer stops only in the state "stopped".
export const canStop = (): boolean => stateAsked() === "stopped";

let attempt = 0;
// The state opens already stopped.
let reason: string | null = canStop() ? REASONS[0] : null;
const listeners = new Set<() => void>();

function set(next: string | null): void {
  reason = next;
  listeners.forEach((listener) => {
    listener();
  });
}

export const stop = (): void => {
  set(REASONS[attempt % REASONS.length] ?? null);
};

export const tryAgain = (): void => {
  attempt += 1;
  set(null);
};

export const useStoppedReason = (): string | null =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => reason,
  );
