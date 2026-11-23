// A value that stays on show for a while before the next one replaces it, so
// a line that changes many times a second can still be read. Only the newest
// value waits: the ones in between are skipped.

export type Clock = {
  now: () => number;
  // Runs a function later; returns a way to cancel it.
  later: (run: () => void, ms: number) => () => void;
};

export class Steady<T> {
  private shown: T;
  private since: number;
  // The newest value that has not been shown yet.
  private waiting: { value: T } | null = null;
  private cancel: (() => void) | null = null;
  private listeners = new Set<() => void>();
  private readonly hold: number;
  private readonly clock: Clock;
  private readonly same: (a: T, b: T) => boolean;

  constructor(
    first: T,
    hold: number,
    clock: Clock,
    same: (a: T, b: T) => boolean = Object.is,
  ) {
    this.shown = first;
    this.hold = hold;
    this.clock = clock;
    this.same = same;
    this.since = clock.now();
  }

  // What is on show now.
  readonly get = (): T => this.shown;

  // Tells when what is on show changes (for useSyncExternalStore).
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // The newest value: on show now when the one before had its time, else as
  // soon as it has.
  offer(value: T): void {
    if (this.same(this.waiting?.value ?? this.shown, value)) return;
    const left = this.since + this.hold - this.clock.now();
    if (left <= 0) {
      this.show(value);
      return;
    }
    this.waiting = { value };
    this.cancel ??= this.clock.later(() => {
      this.cancel = null;
      if (this.waiting) this.show(this.waiting.value);
    }, left);
  }

  // A value on show at once, with nothing waiting (a new start).
  reset(value: T): void {
    this.cancel?.();
    this.cancel = null;
    this.waiting = null;
    if (this.same(this.shown, value)) return;
    this.show(value);
  }

  private show(value: T): void {
    this.waiting = null;
    this.shown = value;
    this.since = this.clock.now();
    for (const listener of this.listeners) listener();
  }
}
