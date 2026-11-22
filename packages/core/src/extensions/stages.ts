// The order of the stages work goes through. No stage is fixed: each comes
// from an extension, which suggests its place by naming the stages it comes
// after and before. The factory works the order out from those suggestions;
// when two stages both fit one place, it cannot tell which comes first and
// says so (a clash) for the team to settle. The team's own order, kept in the
// factory's files, wins over every suggestion: the team can move any stage.

import type { Check, Extension } from "./extension.ts";

// A stage in the order: who brings it, and the words to show it with.
export type PlacedStage = { id: string; name: string; by: string };

// Two stages that both fit the same place.
export type Clash = { first: PlacedStage; second: PlacedStage };

export type StageOrder = { order: PlacedStage[]; clash: Clash | null };

function stagesOf(extensions: Extension[]): PlacedStage[] {
  return extensions.flatMap((extension) =>
    extension.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      by: extension.id,
    })),
  );
}

// The neighbours each stage names, as "this one comes before that one"
// pairs between stages that exist.
function pairsOf(
  extensions: Extension[],
  known: Set<string>,
): [string, string][] {
  return extensions.flatMap((extension) =>
    extension.stages.flatMap((stage) => [
      ...stage.after
        .filter((other) => known.has(other))
        .map((other): [string, string] => [other, stage.id]),
      ...stage.before
        .filter((other) => known.has(other))
        .map((other): [string, string] => [stage.id, other]),
    ]),
  );
}

// The order the suggestions give, and the first place they leave open: two
// stages free to come next, or stages that each want to come after another.
function suggested(
  stages: PlacedStage[],
  pairs: [string, string][],
): StageOrder {
  const order: PlacedStage[] = [];
  let clash: Clash | null = null;
  let waiting = [...stages];
  while (waiting.length > 0) {
    const free = waiting.filter(
      (stage) =>
        !pairs.some(
          ([before, after]) =>
            after === stage.id && waiting.some((one) => one.id === before),
        ),
    );
    // Stages that each want to come after another one: no way to tell which.
    const next = free.length > 0 ? free : waiting;
    const [first, second] = next;
    if (first && second) clash ??= { first, second };
    if (first) {
      order.push(first);
      waiting = waiting.filter((stage) => stage !== first);
    }
  }
  return { order, clash };
}

// Where a stage the team's order does not know yet goes: after the last of
// the stages it comes after, or before the first it comes before, or last.
function slotted(
  kept: PlacedStage[],
  stage: PlacedStage,
  extensions: Extension[],
): PlacedStage[] {
  const spec = extensions
    .flatMap((extension) => extension.stages)
    .find((one) => one.id === stage.id);
  const at = (id: string) => kept.findIndex((one) => one.id === id);
  const after = Math.max(-1, ...(spec?.after ?? []).map(at));
  const before = (spec?.before ?? []).map(at).filter((i) => i >= 0);
  let place = kept.length;
  if (after >= 0) place = after + 1;
  else if (before.length > 0) place = Math.min(...before);
  return [...kept.slice(0, place), stage, ...kept.slice(place)];
}

// The stages of the installed extensions, in order. `chosen` is the team's own
// order (stage ids, from the factory's files): the stages it names stay as
// it has them, and a stage it does not know yet goes where its extension
// suggests.
export function orderStages(
  extensions: Extension[],
  chosen: string[] = [],
): StageOrder {
  const stages = stagesOf(extensions);
  const known = new Set(stages.map((stage) => stage.id));
  const worked = suggested(stages, pairsOf(extensions, known));
  const kept = chosen
    .map((id) => stages.find((stage) => stage.id === id))
    .filter((stage) => stage !== undefined);
  if (kept.length === 0) return worked;
  const placed = new Set(kept.map((stage) => stage.id));
  const order = worked.order
    .filter((stage) => !placed.has(stage.id))
    .reduce((so, stage) => slotted(so, stage, extensions), kept);
  return { order, clash: null };
}

// The stages in the team's order, each with the checks its extension asks:
// what a piece of work goes through (work/work.ts).
export function courseOf(
  extensions: Extension[],
  chosen: string[] = [],
): { id: string; checks: Check[] }[] {
  const specs = extensions.flatMap((extension) => extension.stages);
  return orderStages(extensions, chosen).order.map((stage) => ({
    id: stage.id,
    checks: specs.find((spec) => spec.id === stage.id)?.checks ?? [],
  }));
}
