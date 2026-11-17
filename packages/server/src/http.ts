// The server's answers in JSON (or a file, when a route answers with one),
// and a request's body read as JSON.

import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import { Refused } from "./refused.ts";

// A file a route answers with, such as a picture, and its type.
export class FileAnswer {
  readonly file: string;
  readonly type: string;
  constructor(file: string, type: string) {
    this.file = file;
    this.type = type;
  }
}

export function send(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  if (body instanceof FileAnswer) {
    response.writeHead(status, {
      "content-type": body.type,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(readFileSync(body.file));
    return;
  }
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
