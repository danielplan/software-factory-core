// The core's agents' own tools, served over MCP by the factory's server:
// the setup coach's, each idea coach's, and the support kobold's
// (Sprocket's). Each checks the token only its own Claude Code is given,
// instead of the page's header. An extension's kobolds' tools are answered
// by the extension (its answers).

import type { IncomingMessage, ServerResponse } from "node:http";

import { answerTools } from "./coach/setup-tools.ts";
import {
  answerSupportTools,
  type SupportTools,
} from "./kobble/support-tools.ts";
import { readBody, send } from "./http.ts";
import { Refused } from "./refused.ts";
import type { Session } from "./session.ts";

const COACH_TOOLS = "/api/setup/mcp";
const IDEA_TOOLS = /^\/api\/ideas\/mcp\/([\w-]+)$/;
const SUPPORT_TOOLS = "/api/kobble/support/mcp";

export function isAgentTools(incoming: IncomingMessage, url: URL): boolean {
  const path = url.pathname;
  return (
    incoming.method === "POST" &&
    (path === COACH_TOOLS || path === SUPPORT_TOOLS || IDEA_TOOLS.test(path))
  );
}

export async function answerAgentTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  url: URL,
  on: {
    session: Session;
    supportTools: () => SupportTools;
  },
): Promise<void> {
  const body = await readBody(incoming).catch(() => null);
  if (url.pathname === SUPPORT_TOOLS)
    await answerSupportTools(incoming, response, on.supportTools(), body);
  else if (url.pathname === COACH_TOOLS)
    await answerTools(incoming, response, on.session.coachTools(), body);
  else await ideaTools(incoming, response, on.session, url.pathname, body);
}

// One idea coach's tool call; an idea that is not there is said plainly.
async function ideaTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  session: Session,
  path: string,
  body: unknown,
): Promise<void> {
  const id = IDEA_TOOLS.exec(path)?.[1] ?? "";
  try {
    await answerTools(incoming, response, session.ideaTools(id), body);
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    send(response, 404, { error: error.message });
  }
}
