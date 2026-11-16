// The server's answers in JSON, and a request's body read as JSON.

import type { IncomingMessage, ServerResponse } from "node:http";

import { Refused } from "./refused.ts";

export function send(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

export async function readBody(incoming: IncomingMessage): Promise<unknown> {
  let text = "";
  for await (const chunk of incoming) text += String(chunk);
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Refused("That request was not understood.");
  }
}
