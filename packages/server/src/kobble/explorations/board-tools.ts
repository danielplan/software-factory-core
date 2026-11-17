// The kobold's tool in an exploration's conversation, served over MCP (the
// standard way to give Claude new actions): `board`, which changes the
// board while it talks. Only the conversation's own Claude Code has the
// token.

import type { IncomingMessage, ServerResponse } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { COACH_HEADER } from "../../coach/setup-tools.ts";
import { answerMcp, toolAnswer } from "../../mcp.ts";
import type { BoardChange } from "./board-edit.ts";

export type BoardTools = {
  token: string;
  change: (change: BoardChange) => string;
};

const INPUT = {
  title: z
    .string()
    .optional()
    .describe("The exploration's title, a few words."),
  problem: z
    .string()
    .optional()
    .describe("The problem, in two or three sentences."),
  question: z
    .string()
    .optional()
    .describe(
      'What has to be decided ("How do the hours reach the accountant?").',
    ),
  options: z
    .array(
      z.object({
        key: z
          .string()
          .optional()
          .describe("An option to change (A, B…); none: a new one."),
        name: z.string().min(1).describe("A few words."),
        difference: z
          .string()
          .optional()
          .describe("How it differs, in one line."),
      }),
    )
    .optional(),
  removeOptions: z
    .array(z.string())
    .optional()
    .describe("Options to take off, by letter."),
  notes: z
    .array(z.string())
    .optional()
    .describe("Notes to add, one short line each."),
  removeNotes: z
    .array(z.number().int())
    .optional()
    .describe("Notes to take off, by number."),
};

function serverFor(on: BoardTools): McpServer {
  const server = new McpServer({ name: "board", version: "1.0.0" });
  server.registerTool(
    "board",
    {
      description:
        "Change the exploration's board in one call: its title, the problem, the question, options (new ones get the next letter; change one by its letter; take one off) and notes. Answers with the whole board.",
      inputSchema: INPUT,
    },
    (args) => toolAnswer(() => on.change(args)),
  );
  return server;
}

export async function answerBoardTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  on: BoardTools,
  body: unknown,
): Promise<void> {
  if (incoming.headers[COACH_HEADER] !== on.token) {
    response.writeHead(403, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Only this exploration's kobold." }));
    return;
  }
  await answerMcp(incoming, response, serverFor(on), body);
}
