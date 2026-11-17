// The server's answers in JSON, and a request's body read as JSON.

import type { IncomingMessage, ServerResponse } from "node:http";

import { Refused } from "./refused.ts";

// The most a request's body may hold: far more than the page ever sends
// (a pasted source, the setup map), so a runaway request cannot fill the
// server's memory.
export const MOST_BODY_BYTES = 10 * 1024 * 1024;

// A body larger than MOST_BODY_BYTES (answered 413).
export class TooLarge extends Refused {
  constructor() {
    super("That request is too large.");
  }
}

// The page's files are never put inside another site's frame (so a button
// cannot be pressed through it), never guessed as another type, and send no
// address on to the sites they link to.
export const PAGE_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "content-security-policy": "frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
};

// A body too large, a request refused with why, or something that went
// wrong.
export function statusOf(error: unknown): number {
  if (error instanceof TooLarge) return 413;
  return error instanceof Refused ? 409 : 500;
}

export function send(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

// The body as JSON. Its bytes are joined before they are read as text, so a
// letter written with more than one byte (è, an emoji) that arrives split
// between two pieces stays whole.
export async function readBody(incoming: IncomingMessage): Promise<unknown> {
  if (Number(incoming.headers["content-length"] ?? 0) > MOST_BODY_BYTES)
    throw new TooLarge();
  const pieces: Buffer[] = [];
  let size = 0;
  for await (const piece of incoming as AsyncIterable<Buffer>) {
    size += piece.length;
    if (size > MOST_BODY_BYTES) throw new TooLarge();
    pieces.push(piece);
  }
  const text = Buffer.concat(pieces).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Refused("That request was not understood.");
  }
}
