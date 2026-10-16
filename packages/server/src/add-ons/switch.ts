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
