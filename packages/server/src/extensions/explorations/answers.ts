// The requests Explorations answers itself: its kobolds' tools over MCP
// (Doodle's board tools in each exploration, and each prototype's maker),
// each checking the token only its own Claude Code is given instead of the
// page's header, and the made-up world the prototypes share
// (world-route.ts), which answers pages on any port of this computer.

import type { ServerResponse } from "node:http";

import { readBody, send } from "../../http.ts";
import type { Answer } from "../../plugs/extension.ts";
import { Refused } from "../../refused.ts";
import { answerBoardTools, type BoardTools } from "./board-tools.ts";
import { answerMakerTools, type MakerTools } from "./maker-tools.ts";
import { answerWorld, isWorldRoute } from "./world-route.ts";
import type { ExplorationWorlds } from "./worlds.ts";

const BOARD_TOOLS = /^\/api\/kobble\/explorations\/mcp\/(X-\d+)$/;
const MAKER_TOOLS = /^\/api\/kobble\/explorations\/maker\/(X-\d+)\/([A-Z]\d*)$/;

export function explorationAnswers(on: {
  boardTools: (id: string) => BoardTools;
  makerTools: (id: string, key: string) => MakerTools;
  worlds: ExplorationWorlds;
}): Answer[] {
  return [
    {
      matches: (_incoming, url) => isWorldRoute(url),
      answer: (incoming, response, url) =>
        answerWorld(incoming, response, url, on.worlds),
    },
    {
      matches: (incoming, url) =>
        incoming.method === "POST" && BOARD_TOOLS.test(url.pathname),
      answer: async (incoming, response, url) => {
        const body = await readBody(incoming).catch(() => null);
        const id = BOARD_TOOLS.exec(url.pathname)?.[1] ?? "";
        await saidPlainly(response, () =>
          answerBoardTools(incoming, response, on.boardTools(id), body),
        );
      },
    },
    {
      matches: (incoming, url) =>
        incoming.method === "POST" && MAKER_TOOLS.test(url.pathname),
      answer: async (incoming, response, url) => {
        const body = await readBody(incoming).catch(() => null);
        const [, id = "", key = ""] = MAKER_TOOLS.exec(url.pathname) ?? [];
        await saidPlainly(response, () =>
          answerMakerTools(incoming, response, on.makerTools(id, key), body),
        );
      },
    },
  ];
}

// One tool call; an exploration or a prototype that is not there is said
// plainly.
async function saidPlainly(
  response: ServerResponse,
  answer: () => Promise<void>,
): Promise<void> {
  try {
    await answer();
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    send(response, 404, { error: error.message });
  }
}
