// Talking to the factory's server: its state (once, then every change as
// it happens) and the buttons' requests.

import { useEffect, useState } from "react";

import type { State } from "../../server/src/api.ts";
import type { KoboldJob } from "../../server/src/kobold/kobold.ts";
import type { VersionRun } from "../../server/src/prototypes/mode.ts";

export type {
  AddOnView,
  Board,
  CardView,
  CoachView,
  Draft,
  GitHubStatus,
  IdeaView,
  KitView,
  IconName,
  StageMap,
  State,
  WorkView,
} from "../../server/src/api.ts";
export type { Customer, GroupView, Source } from "../../core/src/index.ts";
export type {
  PersonaCard,
  PersonaPage,
  RecordsView,
  StoryCard,
  StoryPage,
  UnderstandOverview,
} from "../../server/src/records/views.ts";
export type {
  KoboldNews,
  SignalView,
} from "../../server/src/records/signal-views.ts";
export type { KoboldJob } from "../../server/src/kobold/kobold.ts";
export type {
  ExploreList,
  IdeaPage,
  IdeaRow,
  PersonaTag,
  VersionCard,
} from "../../server/src/explore/views.ts";
export type { PrototypePage } from "../../server/src/explore/prototype-page.ts";
export type {
  BuildView,
  TicketView,
  WaitingFix,
} from "../../server/src/build/views.ts";
export type { SeenDraft } from "../../server/src/build/seen.ts";
export type { ProductPage } from "../../server/src/product/routes.ts";
export type { Answered } from "../../server/src/build/answer.ts";
export type { VersionRun } from "../../server/src/prototypes/mode.ts";
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

// Who hears of changes on the stream besides the state: pages that show
// records read them again when they change, and the kobold's jobs as they
// work.
const recordsHeard = new Set<() => void>();
const koboldHeard = new Set<(jobs: KoboldJob[]) => void>();
const prototypesHeard = new Set<(runs: VersionRun[]) => void>();

export function onRecordsChanged(listener: () => void): () => void {
  recordsHeard.add(listener);
  return () => recordsHeard.delete(listener);
}

export function onKobold(listener: (jobs: KoboldJob[]) => void): () => void {
  koboldHeard.add(listener);
  return () => koboldHeard.delete(listener);
}

// What runs in prototype mode, whenever it changes.
export function onPrototypes(
  listener: (runs: VersionRun[]) => void,
): () => void {
  prototypesHeard.add(listener);
  return () => prototypesHeard.delete(listener);
}

function tellRecords(): void {
  for (const listener of recordsHeard) listener();
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
      tellRecords();
    };
    events.addEventListener("records-changed", tellRecords);
    events.addEventListener("kobold", (event: MessageEvent<string>) => {
      const { jobs } = JSON.parse(event.data) as { jobs: KoboldJob[] };
      for (const listener of koboldHeard) listener(jobs);
    });
    events.addEventListener("prototypes", (event: MessageEvent<string>) => {
      const { runs } = JSON.parse(event.data) as { runs: VersionRun[] };
      for (const listener of prototypesHeard) listener(runs);
    });
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

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
