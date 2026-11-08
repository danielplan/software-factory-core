// The light of one part (stopped, starting, running, problem, or none for a
// part with nothing to start or check) and what a screen shows of it. Plain
// data and the rules for changing it; the launcher decides when.

import type { Part } from "@software-factory/core";

import type { Program } from "./programs.ts";

export type Light = "running" | "starting" | "stopped" | "problem" | "none";

export type Problem = { title: string; text: string; details: string[] };

export type PartView = {
  id: string;
  name: string;
  area: Part["area"];
  does: string;
  dependsOn: string[];
  start: Part["start"];
  light: Light;
  // What it is doing while it starts ("Installing packages").
  step: string | null;
  problem: Problem | null;
  link: string | null;
  canStart: boolean;
  canStop: boolean;
  // Started outside the factory: it runs, but the factory cannot stop it.
  outside: boolean;
};

export type NewProblem = { title: string; text: string; details?: string[] };

// What the launcher keeps about one part.
export type PartLight = {
  light: Light;
  step: string | null;
  problem: Problem | null;
  outside: boolean;
  program: Program | null;
  stopping: boolean;
  starting: Promise<void> | null;
};

export function newPartLight(part: Part): PartLight {
  return {
    light: part.run || part.health ? "stopped" : "none",
    step: null,
    problem: null,
    outside: false,
    program: null,
    stopping: false,
    starting: null,
  };
}

export function setLight(
  inner: PartLight,
  light: Light,
  step: string | null,
): void {
  inner.light = light;
  inner.step = step;
  if (light !== "problem") inner.problem = null;
}

export function failLight(inner: PartLight, problem: NewProblem): void {
  inner.problem = { details: [], ...problem };
  inner.light = "problem";
  inner.step = null;
}

export function resetLight(inner: PartLight): void {
  inner.light = "stopped";
  inner.step = null;
  inner.problem = null;
  inner.outside = false;
}

export function viewOf(
  part: Part,
  inner: PartLight,
  link: string | null,
): PartView {
  return {
    id: part.id,
    name: part.name,
    area: part.area,
    does: part.does,
    dependsOn: part.dependsOn,
    start: part.start,
    light: inner.light,
    step: inner.step,
    problem: inner.problem,
    link,
    // A part that starts with others has no buttons, but can be tried
    // again after a problem.
    canStart:
      part.start !== "never" &&
      Boolean(part.run) &&
      (inner.light === "problem" ||
        (inner.light === "stopped" && part.start !== "with")),
    canStop:
      part.start !== "with" &&
      !inner.outside &&
      Boolean(inner.program || inner.starting),
    outside: inner.outside,
  };
}
