// Installing or removing an extension in the company file: a built-in one
// is listed in `without` while it is removed, any other in `extensions`
// while it is installed. Installing brings what it needs; removing one that
// another installed extension needs, or that is always needed, is refused.

import type { Company, Extension } from "@software-factory/core";

import { Refused } from "../refused.ts";

// Whether the company has the extension installed.
export function installed(company: Company, extension: Extension): boolean {
  return extension.core
    ? !company.without.includes(extension.id)
    : company.extensions.includes(extension.id);
}

// The installed extensions that need this one.
export function neededBy(
  company: Company,
  extensions: Extension[],
  id: string,
): Extension[] {
  return extensions.filter(
    (other) => installed(company, other) && other.needs.includes(id),
  );
}

// The extensions installing this one also installs: what it needs, and what
// that needs, not installed yet.
export function toInstall(
  company: Company,
  extensions: Extension[],
  id: string,
): Extension[] {
  const found: Extension[] = [];
  const visit = (wanted: string) => {
    const extension = extensions.find((e) => e.id === wanted);
    if (!extension) throw new Refused(`There is no extension ${wanted}.`);
    if (installed(company, extension) || found.includes(extension)) return;
    found.push(extension);
    extension.needs.forEach(visit);
  };
  visit(id);
  return found;
}

function listed(company: Company, extension: Extension, on: boolean): Company {
  const list = extension.core ? "without" : "extensions";
  const inList = extension.core ? !on : on;
  const others = company[list].filter((id) => id !== extension.id);
  return { ...company, [list]: inList ? [...others, extension.id] : others };
}

export function switched(
  company: Company,
  extensions: Extension[],
  id: string,
  on: boolean,
): Company {
  const extension = extensions.find((e) => e.id === id);
  if (!extension) throw new Refused(`There is no extension ${id}.`);
  if (on)
    return toInstall(company, extensions, id).reduce(
      (now, one) => listed(now, one, true),
      company,
    );
  if (extension.always)
    throw new Refused(`${extension.name} is always needed.`);
  if (company.tracker === extension.id)
    throw new Refused(
      `Work is tracked with ${extension.name}: choose another board first.`,
    );
  const needing = neededBy(company, extensions, id);
  if (needing.length > 0) {
    const names = needing.map((e) => e.name).join(" and ");
    const verb = needing.length === 1 ? "needs" : "need";
    throw new Refused(
      `${names} ${verb} ${extension.name}. Remove ${needing.length === 1 ? "it" : "them"} first.`,
    );
  }
  return listed(company, extension, false);
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
