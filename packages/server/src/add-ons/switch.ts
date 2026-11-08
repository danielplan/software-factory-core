// Switching an add-on on or off in the company file: a built-in one is
// listed in `without` while it is off, any other in `extensions` while it
// is on.

import type { Company, Extension } from "@software-factory/core";

import { Refused } from "../refused.ts";

export function switched(
  company: Company,
  extensions: Extension[],
  id: string,
  on: boolean,
): Company {
  const extension = extensions.find((e) => e.id === id);
  if (!extension) throw new Refused(`There is no add-on ${id}.`);
  if (!on && company.tracker === extension.id)
    throw new Refused(
      `Work is tracked with ${extension.name}: choose another board first.`,
    );
  const list = extension.core ? "without" : "extensions";
  const listed = extension.core ? !on : on;
  const others = company[list].filter((id) => id !== extension.id);
  return { ...company, [list]: listed ? [...others, extension.id] : others };
}

// Work tracked with one tracker from now on (or none: the factory's own
// board): it is on, and the other built-in trackers are off, so only the
// one in use shows as added.
export function trackedWith(
  company: Company,
  extensions: Extension[],
  tracker: Company["tracker"],
): Company {
  const trackers = new Set(
    extensions.filter((e) => e.core && e.tracker).map((e) => e.id),
  );
  const without = [
    ...company.without.filter((id) => !trackers.has(id)),
    ...[...trackers].filter((id) => id !== tracker),
  ];
  return { ...company, tracker, without };
}
