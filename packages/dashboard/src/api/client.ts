// Talking to the factory's server: its requests, and the buttons'. Reading
// what a page shows goes through TanStack Query (query.ts); the factory's
// state and its stream of changes are in live.ts.

import { i18n } from "../i18n/messages.ts";

// The kinds of records the server answers with, as their schemas read
// them (schemas/): every type is inferred from its zod schema.
export type {
  AddOnView,
  ShownPart,
  ShownView,
  StagesView,
} from "./schemas/add-ons.ts";
export type {
  Card,
  CoachView,
  Draft,
  IconName,
  IdeaView,
} from "./schemas/coach.ts";
export type { Face, PersonaColor, PersonaHat } from "./schemas/faces.ts";
export type { GroupView } from "./schemas/setting-groups.ts";
export type { Light, PartView } from "./schemas/parts.ts";
export type { KitView, ProductView } from "./schemas/products.ts";
export type { FactoryState, State } from "./schemas/state.ts";
export type { Board, CardView, StageMap, WorkView } from "./schemas/work.ts";
export type { SignalRow, SignalsView, SyncView } from "./schemas/signals.ts";
export type {
  PersonaPage as KobblePersonaPage,
  PersonaRow,
} from "./schemas/personas.ts";
export type {
  TestDraft,
  TestMoment,
  TestPage,
  TestPersona,
  TestRow,
} from "./schemas/testing.ts";
export type { TestNow } from "./schemas/signals.ts";
export type { ReleasesView } from "./schemas/releases.ts";
export type { FactoryCard, FactoryView } from "./schemas/factory.ts";
export type {
  ExplorationPage,
  ExplorationRow,
  ExplorationsView,
  TestResult,
  VersionRun,
} from "./schemas/explorations.ts";

// A persona's face worked out from who they are.
export { faceFrom } from "../../../core/src/kobble/face.ts";

// The core's version, and where its releases are (for links to its docs).
export { CORE_VERSION, RELEASE_SOURCE } from "../../../core/src/version.ts";

// The server answers buttons only from its own page, which says so.
const PAGE_HEADER = "x-software-factory";

export class RequestProblem extends Error {}

async function answerOf<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const error = (body as { error?: unknown }).error;
    throw new RequestProblem(
      typeof error === "string" ? error : i18n.t("shell.noAnswer"),
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

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
