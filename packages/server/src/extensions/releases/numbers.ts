// The numbers of a product's releases: x.y.z, tagged v<x.y.z>. The next one
// follows on from the last. Most releases raise only the last number, new
// things included; the middle number goes up only when people have to do
// something, or something they relied on changes or goes away (the same rule
// the core follows, docs/reference/versions.md). The first number is never raised by
// the kobold: the team types it when it wants to.

import { Refused } from "../../refused.ts";

// The number of a product with no release yet; the team can change it.
export const FIRST_NUMBER = "0.1.0";

const NUMBER = /^(\d+)\.(\d+)\.(\d+)$/;
const TAG = /^v(\d+\.\d+\.\d+)$/;

type Parts = [number, number, number];

function partsOf(number: string): Parts | null {
  const found = NUMBER.exec(number);
  return found ? [Number(found[1]), Number(found[2]), Number(found[3])] : null;
}

function compare(a: Parts, b: Parts): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

export const tagOf = (number: string) => `v${number}`;

// The number a tag stands for; none for a tag of another shape.
export function numberOfTag(tag: string): string | null {
  return TAG.exec(tag)?.[1] ?? null;
}

// The highest number among the tags (other shapes are ignored); none
// without a release.
export function lastNumber(tags: string[]): string | null {
  const numbers = tags
    .map(numberOfTag)
    .filter((number) => number !== null)
    .sort((a, b) => compare(partsOf(b) ?? [0, 0, 0], partsOf(a) ?? [0, 0, 0]));
  return numbers[0] ?? null;
}

// The number after the last: the middle one when people have to do
// something, the last one otherwise.
export function nextNumber(last: string | null, act: boolean): string {
  const parts = last ? partsOf(last) : null;
  if (!parts) return FIRST_NUMBER;
  return act
    ? `${String(parts[0])}.${String(parts[1] + 1)}.0`
    : `${String(parts[0])}.${String(parts[1])}.${String(parts[2] + 1)}`;
}

// The number the team wants, refused with why unless it is x.y.z, higher
// than the last, and not a tag there already.
export function checkNumber(
  wanted: string,
  last: string | null,
  tags: string[],
): string {
  const number = wanted.trim();
  const parts = partsOf(number);
  if (!parts)
    throw new Refused(
      `“${number}” is not a release number. Use three numbers with dots, like 1.4.3.`,
    );
  if (tags.includes(tagOf(number)))
    throw new Refused(`There is a release ${number} already.`);
  const before = last ? partsOf(last) : null;
  if (before && compare(parts, before) <= 0)
    throw new Refused(
      `${number} is not higher than the last release, ${last ?? ""}.`,
    );
  return number;
}
