// Reads the lines Claude Code prints (stream-json): the reply as it is being
// written, and the result at the end.

export type ClaudeResult = {
  ok: boolean;
  text: string;
  error?: string;
  // Claude's conversation id, to continue the same conversation later.
  session?: string;
};

type ClaudeEvent = {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  session_id?: string;
  event?: {
    type?: string;
    delta?: { type?: string; text?: string };
  } | null;
};

// One printed line as an event, or null when it is not JSON.
export function readEvent(line: string): ClaudeEvent | null {
  try {
    return JSON.parse(line) as ClaudeEvent;
  } catch {
    return null;
  }
}

// For a part of the reply being written: the reply so far, given what was
// written before this event.
export function replySoFar(event: ClaudeEvent, writing: string): string {
  const part = event.event;
  let reply = writing;
  if (part?.type === "message_start") reply = "";
  if (part?.delta?.type === "text_delta") reply += part.delta.text ?? "";
  return reply;
}

// Whether this event adds text to the reply being written.
export function addsText(event: ClaudeEvent): boolean {
  return event.event?.delta?.type === "text_delta";
}

// The result event as a ClaudeResult; `errors` is what Claude printed as errors.
export function resultOf(event: ClaudeEvent, errors = ""): ClaudeResult {
  return event.is_error
    ? {
        ok: false,
        text: "",
        error: [String(event.result ?? event.subtype), errors.trim()]
          .filter(Boolean)
          .join(" "),
        session: event.session_id,
      }
    : {
        ok: true,
        text: event.result ?? "",
        session: event.session_id,
      };
}
