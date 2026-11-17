// The live app's export, as Kobble reads it (docs/reference/live-export.md):
// GET <KOBBLE_LIVE_URL>?since=<cursor> answers with the events since the
// cursor and the cursor to ask from next time. The events are anonymous: a
// customer is an id, never a name. Each event becomes at most one signal.

import { z } from "zod";

import type { KobblePersona, KobbleSignal } from "./schemas.ts";

export const LIVE_EVENT_KINDS = [
  "bug-report",
  "suggestion",
  "limit",
  "automation-failed",
  "error",
  "other",
] as const;
export type LiveEventKind = (typeof LIVE_EVENT_KINDS)[number];

export const liveEventSchema = z.object({
  id: z.string().min(1),
  at: z.iso.datetime({ offset: true }),
  kind: z.enum(LIVE_EVENT_KINDS),
  // The anonymous customer id, when there is one.
  customer: z.string().min(1).nullable(),
  text: z.string().trim().min(1),
});

export const liveExportSchema = z.object({
  cursor: z.string(),
  events: z.array(liveEventSchema),
});

export type LiveEvent = z.infer<typeof liveEventSchema>;
export type LiveExport = z.infer<typeof liveExportSchema>;

// What each kind of event is as a signal: "Report a bug" and "Suggest
// something" in the app, the assistant hitting something it cannot do,
// failed automations and errors, and anything else.
const AS_SIGNAL: Record<
  LiveEventKind,
  Pick<KobbleSignal, "type" | "source">
> = {
  "bug-report": { type: "bug", source: "app" },
  suggestion: { type: "request", source: "app" },
  limit: { type: "request", source: "usage" },
  "automation-failed": { type: "bug", source: "errors" },
  error: { type: "bug", source: "errors" },
  other: { type: "feedback", source: "usage" },
};

// The new signal for an event, with this id: its persona is the one that
// stands for the event's customer, if any.
export function signalFromEvent(
  event: LiveEvent,
  id: string,
  personas: KobblePersona[],
): KobbleSignal {
  const persona = event.customer
    ? personas.find((one) => one.customers.includes(event.customer ?? ""))
    : undefined;
  return {
    id,
    ...AS_SIGNAL[event.kind],
    sourceId: event.id,
    customer: event.customer,
    persona: persona?.id ?? null,
    at: event.at,
    text: event.text,
    status: "new",
    to: null,
    already: null,
  };
}
