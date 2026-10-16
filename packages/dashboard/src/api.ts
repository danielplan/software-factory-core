// Talking to the factory's server: its state (once, then every change as
// it happens) and the buttons' requests.

import { useEffect, useState } from "react";

import type { State } from "../../server/src/api.ts";

export type {
  CoachView,
  DetectAnswer,
  Draft,
  FolderList,
  IconName,
  Job,
  KitView,
  ProductView,
  SetupProduct,
  State,
} from "../../server/src/api.ts";
export type { Candidate, Company, GroupView } from "../../core/src/index.ts";
export type { Light, PartView } from "../../launcher/src/index.ts";

// The server answers buttons only from its own page, which says so.
const PAGE_HEADER = "x-software-factory";

export class RequestProblem extends Error {}

async function answerOf<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const error = (body as { error?: unknown }).error;
    throw new RequestProblem(
      typeof error === "string"
        ? error
        : "The factory did not answer. Is its window still open?",
    );
  }
  return body as T;
}

export async function get<T>(path: string): Promise<T> {
  return answerOf<T>(await fetch(path));
}

export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  return answerOf<T>(
    await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", [PAGE_HEADER]: "1" },
      body: JSON.stringify(body),
    }),
  );
}

// The factory's state, kept up to date from its stream of changes; null
// until the first answer; `connected` false while the server is away.
export function useFactoryState(): { state: State | null; connected: boolean } {
  const [state, setState] = useState<State | null>(null);
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    let closed = false;
    get<State>("/api/state").then(
      (first) => {
        if (!closed) setState(first);
      },
      () => {
        setConnected(false);
      },
    );
    // EventSource tries again by itself when the connection drops.
    const events = new EventSource("/api/events");
    events.onmessage = (event: MessageEvent<string>) => {
      setState(JSON.parse(event.data) as State);
      setConnected(true);
    };
    events.onopen = () => {
      setConnected(true);
      void get<State>("/api/state").then(setState, () => undefined);
    };
    events.onerror = () => {
      setConnected(false);
    };
    return () => {
      closed = true;
      events.close();
    };
  }, []);
  return { state, connected };
}

// "My Shop" → "my-shop", as the server makes ids: lowercase words joined
// by dashes, starting with a letter.
export function idFrom(name: string): string {
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9]/)
    .filter(Boolean);
  const id = words.join("-");
  const start = id.search(/[a-z]/);
  return start === -1 ? "app" : id.slice(start);
}

// A folder's path without the slashes at its end.
export function withoutEndSlashes(path: string): string {
  let end = path.length;
  while (end > 1 && (path[end - 1] === "/" || path[end - 1] === "\\")) end -= 1;
  return path.slice(0, end);
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
