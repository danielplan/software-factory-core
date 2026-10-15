// Starts, watches and stops the parts of a company's factory, and keeps the
// light of each one. It only starts and stops programs: what the parts are
// comes from the products' kits and the extensions.

import { addressOf, linkOf, type Part, portOf } from "@software-factory/core";

import {
  failLight,
  type Light,
  type NewProblem,
  newPartLight,
  type PartLight,
  type PartView,
  resetLight,
  setLight,
  viewOf,
} from "./part-light.ts";
import { answers, portTaken } from "./probe.ts";
import type { Program } from "./programs.ts";
import { partById, type Starter, startPart } from "./start-part.ts";

export class Launcher {
  readonly root: string;
  private parts: Part[];
  private inner = new Map<string, PartLight>();
  private listeners = new Set<() => void>();
  private timer: NodeJS.Timeout;
  private ticking = false;

  // root: the factory folder; settings files and relative folders resolve
  // from there (a part's folder may also be absolute).
  constructor(options: { root: string; parts: Part[]; everyMs?: number }) {
    this.root = options.root;
    this.parts = options.parts;
    for (const part of this.parts) this.inner.set(part.id, newPartLight(part));
    this.timer = setInterval(() => {
      void this.tick();
    }, options.everyMs ?? 3000);
  }

  // The factory changed (a product added): the new list of parts. Parts
  // already known keep their state, so what runs keeps running.
  setParts(parts: Part[]): void {
    this.parts = parts;
    for (const part of parts)
      if (!this.inner.has(part.id)) this.inner.set(part.id, newPartLight(part));
    this.notify();
  }

  state(): PartView[] {
    return this.parts.map((part) =>
      viewOf(part, this.get(part.id), linkOf(part, this.parts, this.root)),
    );
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Starts every part that starts with everything ("auto").
  async startAll(): Promise<void> {
    await Promise.all(
      this.parts.filter((p) => p.start === "auto").map((p) => this.start(p.id)),
    );
  }

  // Starts a part, what it depends on first. Asked twice, it starts once.
  start(id: string): Promise<void> {
    const inner = this.get(id);
    inner.starting ??= startPart(this.starter(), this.part(id)).finally(() => {
      inner.starting = null;
      this.notify();
    });
    return inner.starting;
  }

  // Stops a part, what depends on it first.
  async stop(id: string): Promise<void> {
    const part = this.part(id);
    for (const dependent of this.dependentsOf(part))
      await this.stopProgram(dependent);
    await this.stopProgram(part);
    this.notify();
  }

  // Stops and starts it again, and what depended on it and was running.
  async restart(id: string): Promise<void> {
    const before = this.dependentsOf(this.part(id)).filter(
      (p) => this.get(p.id).light === "running" && !this.get(p.id).outside,
    );
    await this.stop(id);
    await this.start(id);
    for (const dependent of before) await this.start(dependent.id);
  }

  // Stops everything, in reverse order: what needs a part stops before it.
  async stopAll(): Promise<void> {
    for (const part of [...this.parts].reverse()) await this.stopProgram(part);
    this.notify();
  }

  // Stops everything at once, when the factory itself is closing.
  stopNow(): void {
    for (const inner of this.inner.values()) {
      inner.stopping = true;
      inner.program?.stopNow();
    }
  }

  close(): void {
    clearInterval(this.timer);
  }

  private starter(): Starter {
    return {
      root: this.root,
      parts: this.parts,
      lightOf: (id) => this.get(id),
      start: (id) => this.start(id),
      set: (inner, light, step) => {
        this.set(inner, light, step);
      },
      fail: (inner, problem) => {
        this.fail(inner, problem);
      },
      reset: (inner) => {
        resetLight(inner);
      },
      programEnded: (part, program) => {
        this.programEnded(part, program);
      },
    };
  }

  private programEnded(part: Part, program: Program): void {
    const inner = this.get(part.id);
    if (inner.program !== program) return;
    inner.program = null;
    if (inner.stopping) return;
    const during =
      inner.light === "starting" ? "while starting" : "unexpectedly";
    this.fail(inner, {
      title: part.help?.title ?? `${part.name} stopped ${during}`,
      text:
        part.help?.text ??
        "Look at the technical details, then press Try again.",
      details: program.log,
    });
  }

  private async stopProgram(part: Part): Promise<void> {
    const inner = this.get(part.id);
    if (!inner.program && !inner.starting) {
      // Nothing runs any more: a problem or a start cut short is cleared.
      if (inner.light === "problem" || inner.light === "starting")
        resetLight(inner);
      inner.stopping = false;
      return;
    }
    inner.stopping = true;
    await inner.program?.stop();
    inner.program = null;
    await inner.starting;
    resetLight(inner);
    inner.stopping = false;
  }

  // The watch: notices parts started or stopped outside the factory.
  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      for (const part of this.parts) await this.watch(part);
    } finally {
      this.ticking = false;
    }
  }

  private async watch(part: Part): Promise<void> {
    const inner = this.get(part.id);
    if (inner.starting || inner.stopping || inner.program) return;
    if (inner.light === "none" || inner.light === "problem") return;
    const up = await this.answering(part);
    if (up === null) return;
    if (up && inner.light !== "running") {
      inner.outside = Boolean(part.run);
      this.set(inner, "running", null);
    } else if (!up && inner.light === "running") {
      resetLight(inner);
      this.notify();
    }
  }

  // Whether the part answers (its health address, else its port); null
  // when there is no way to tell.
  private async answering(part: Part): Promise<boolean | null> {
    const address = addressOf(part, this.parts, this.root);
    if (part.health && address) return await answers(address + part.health);
    const port = portOf(part, this.parts, this.root);
    return port ? await portTaken(port) : null;
  }

  private dependentsOf(part: Part): Part[] {
    const found: Part[] = [];
    const visit = (id: string) => {
      for (const other of this.parts)
        if (other.dependsOn.includes(id) && !found.includes(other)) {
          found.push(other);
          visit(other.id);
        }
    };
    visit(part.id);
    return found.reverse();
  }

  private set(inner: PartLight, light: Light, step: string | null): void {
    setLight(inner, light, step);
    this.notify();
  }

  private fail(inner: PartLight, problem: NewProblem): void {
    failLight(inner, problem);
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private part(id: string): Part {
    return partById(this.parts, id);
  }

  private get(id: string): PartLight {
    const inner = this.inner.get(id);
    if (!inner) throw new Error(`There is no part "${id}".`);
    return inner;
  }
}
