// The order of work in Settings: moving a stage, answering a clash, and a
// stage's name (Kobble's own are words, a team's say theirs).

import type { TFunction } from "i18next";

type Place = { id: string; name: string };

// The stage ids with one moved a place up (-1) or down (1); a stage at the
// end stays.
export function moveStage(order: string[], id: string, by: -1 | 1): string[] {
  const at = order.indexOf(id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= order.length) return order;
  const next = [...order];
  next.splice(at, 1);
  next.splice(to, 0, id);
  return next;
}

// The answer to a clash: `first` comes before `second`. The order shown
// already has the two one after the other, so only that pair is turned.
export function settle(
  order: string[],
  first: string,
  second: string,
): string[] {
  const a = order.indexOf(first);
  const b = order.indexOf(second);
  if (a < 0 || b < 0 || a < b) return order;
  const next = [...order];
  next[a] = second;
  next[b] = first;
  return next;
}

// A stage's name: Kobble's own come from the words by id, a team's own say
// theirs.
export function stageName(words: TFunction, place: Place): string {
  const names: Record<string, string> = words("market.stages", {
    returnObjects: true,
  });
  return Object.hasOwn(names, place.id)
    ? (names[place.id] ?? place.name)
    : place.name;
}
