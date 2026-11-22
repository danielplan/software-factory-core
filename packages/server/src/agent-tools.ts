// The agents' own tools, served over MCP by the factory's server: the setup
// coach's, each idea coach's, and the board tools of the kobold in each
// exploration, and the support kobold's. Each
// checks the token only its own Claude Code is given, instead of the page's
// header.

import type { IncomingMessage, ServerResponse } from "node:http";

import { answerTools } from "./coach/setup-tools.ts";
import {
  answerBoardTools,
  type BoardTools,
} from "./extensions/explorations/board-tools.ts";
import {
  answerMakerTools,
  type MakerTools,
} from "./extensions/explorations/maker-tools.ts";
import {
  answerSupportTools,
  type SupportTools,
} from "./kobble/support-tools.ts";
import { readBody, send } from "./http.ts";
import { Refused } from "./refused.ts";
import type { Session } from "./session.ts";

const COACH_TOOLS = "/api/setup/mcp";
const IDEA_TOOLS = /^\/api\/ideas\/mcp\/([\w-]+)$/;
const BOARD_TOOLS = /^\/api\/kobble\/explorations\/mcp\/(X-\d+)$/;
const MAKER_TOOLS = /^\/api\/kobble\/explorations\/maker\/(X-\d+)\/([A-Z]\d*)$/;
const SUPPORT_TOOLS = "/api/kobble/support/mcp";

export function isAgentTools(incoming: IncomingMessage, url: URL): boolean {
  const path = url.pathname;
  return (
    incoming.method === "POST" &&
    (path === COACH_TOOLS ||
      path === SUPPORT_TOOLS ||
      IDEA_TOOLS.test(path) ||
      BOARD_TOOLS.test(path) ||
      MAKER_TOOLS.test(path))
  );
}

export async function answerAgentTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  url: URL,
  on: {
    session: Session;
    boardTools: (id: string) => BoardTools;
    makerTools: (id: string, key: string) => MakerTools;
    supportTools: () => SupportTools;
  },
): Promise<void> {
  const body = await readBody(incoming).catch(() => null);
  const board = BOARD_TOOLS.exec(url.pathname)?.[1];
  const maker = MAKER_TOOLS.exec(url.pathname);
  if (board) await boardTools(incoming, response, on.boardTools, board, body);
  else if (maker?.[1] && maker[2]) {
    const [, id, key] = maker;
    await makerTools(incoming, response, () => on.makerTools(id, key), body);
  } else if (url.pathname === SUPPORT_TOOLS)
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

// One maker's tool call; a prototype nobody makes is said plainly.
async function makerTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  tools: () => MakerTools,
  body: unknown,
): Promise<void> {
  try {
    await answerMakerTools(incoming, response, tools(), body);
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    send(response, 404, { error: error.message });
  }
}

// One exploration's board tool call; one that is not there is said plainly.
async function boardTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  tools: (id: string) => BoardTools,
  id: string,
  body: unknown,
): Promise<void> {
  try {
    await answerBoardTools(incoming, response, tools(id), body);
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    send(response, 404, { error: error.message });
  }
}
