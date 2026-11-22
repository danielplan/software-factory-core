// Talking to the factory's server: its state (once, then every change as
// it happens) and the buttons' requests.

import { useEffect, useState } from "react";

import type { State } from "../../server/src/api.ts";

export type {
  AddOnView,
  Board,
  Card,
  CardView,
  CoachView,
  Draft,
  GitHubStatus,
  IconName,
  IdeaView,
  KitView,
  ProductView,
  StageMap,
  State,
  WorkView,
} from "../../server/src/api.ts";
export type {
  Face,
  GroupView,
  PersonaColor,
  PersonaHat,
} from "../../core/src/index.ts";
export type {
  MissionNow,
  PersonaPage as KobblePersonaPage,
  PersonaRow,
  SignalRow,
  SignalsView,
  TestPage,
} from "../../server/src/kobble/views.ts";
export type { PersonaTest } from "../../core/src/index.ts";
export type { ReleasesView } from "../../server/src/releases/routes.ts";
export type { FeedbackView } from "../../server/src/feedback/routes.ts";
export type {
  Kind as FeedbackKind,
  Post as FeedbackPost,
  State as FeedbackState,
} from "../../server/src/feedback/board.ts";
export type { SyncView } from "../../server/src/kobble/sync.ts";
export type { MissionIdea } from "../../server/src/kobble/mission-ideas.ts";
export type {
  FactoryCard,
  FactoryView,
} from "../../server/src/kobble/factory-view.ts";
export type {
  ExplorationPage,
  ExplorationRow,
  ExplorationsView,
  TestResult,
} from "../../server/src/kobble/explorations/views.ts";
export type { VersionRun } from "../../server/src/prototypes/mode.ts";
export type { Light, PartView } from "../../launcher/src/index.ts";

// A persona's face worked out from who they are.
export { faceFrom } from "../../core/src/kobble/face.ts";

// The core's version, and where its releases are (for links to its docs).
export { CORE_VERSION, RELEASE_SOURCE } from "../../core/src/version.ts";

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

// Pages that show Kobble's files (signals, explorations, personas, tests,
// the Factory board) read them again whenever the stream says they
// changed.
const kobbleHeard = new Set<() => void>();

export function onKobbleChanged(listener: () => void): () => void {
  kobbleHeard.add(listener);
  return () => kobbleHeard.delete(listener);
}

function tellKobble(): void {
  for (const listener of kobbleHeard) listener();
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
      tellKobble();
    };
    events.addEventListener("kobble-changed", tellKobble);
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
