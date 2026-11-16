// What a request asks for: a value in its address (?id=…) or a text in its
// body, refused plainly when it is not there.

import { Refused } from "./refused.ts";

export function asked(url: URL, key: string, what: string): string {
  const value = url.searchParams.get(key);
  if (!value) throw new Refused(`Say which ${what}.`);
  return value;
}

export function field(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== "string" || !value)
    throw new Refused(`Say which ${key}.`);
  return value;
}
