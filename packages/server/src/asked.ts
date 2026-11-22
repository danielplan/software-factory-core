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

// A text in the body, which may be empty.
export function text(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== "string") throw new Refused(`Say which ${key}.`);
  return value;
}

export function optionalText(body: unknown, key: string): string | undefined {
  const value = (body as Record<string, unknown> | null)?.[key];
  return typeof value === "string" ? value : undefined;
}

export function record(body: unknown, key: string): Record<string, unknown> {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== "object" || value === null)
    throw new Refused(`Say the ${key}.`);
  return value as Record<string, unknown>;
}

// A switch's new position from a button's body: on only when it says so.
export function on(body: unknown): boolean {
  return (body as { on?: unknown } | null)?.on === true;
}
