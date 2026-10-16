// The setup coach's own tools, served over MCP (the standard way to give
// Claude new actions): `draw` for the map it plans with the owner, and
// `configure` for the factory's settings once the owner says to build it.
// Everything else it does with Claude Code's own tools. Each answers in
// short lines; what does not fit says why, so the coach can correct itself.

import type { IncomingMessage, ServerResponse } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { ICONS } from "../api.ts";
import { Refused } from "../refused.ts";
import type { Configuration } from "./configure.ts";
import type { Drawing } from "./map.ts";

// The header with the coach's token: only its Claude Code is given it.
export const COACH_HEADER = "x-setup-coach";

// What the tools act on: the coach's map and the factory being made.
export type ToolsFor = {
  token: string;
  draw: (drawing: Drawing & { title?: string }) => string;
  // An idea's map may also name the idea.
  titled?: boolean;
  // Only the setup coach's.
  configure?: (configuration: Configuration) => Promise<string>;
};

const card = z.object({
  key: z
    .string()
    .optional()
    .describe("A name for a new card, for arrows to it in this drawing."),
  id: z.string().optional().describe("A card to draw again (replaced)."),
  area: z
    .string()
    .optional()
    .describe(
      "The area it is framed in; cards with the same area go together.",
    ),
  title: z.string().min(1),
  text: z.string().optional().describe("A line or two at most."),
  icon: z.enum(ICONS).optional(),
  picture: z
    .string()
    .optional()
    .describe("A picture's path inside the project (png, jpg, webp, gif)."),
  tone: z.enum(["rule", "question"]).optional(),
  confirmed: z
    .boolean()
    .optional()
    .describe("The owner said or agreed to it; otherwise it is your guess."),
  to: z
    .array(z.object({ card: z.string(), label: z.string().optional() }))
    .optional()
    .describe("The cards it points to (ids, or keys in this drawing)."),
});

const product = z.object({
  name: z.string().min(1),
  kind: z.string().min(1).describe("A kind the kits know."),
  about: z.string().min(1),
  folder: z
    .string()
    .optional()
    .describe(
      "Its code's whole path; none: a new product, made with its kit's starter.",
    ),
  users: z
    .array(z.object({ who: z.string().min(1), does: z.string().min(1) }))
    .optional(),
  dependsOn: z.array(z.string()).optional(),
});

function toolsFor(on: ToolsFor): McpServer {
  const server = new McpServer({ name: "setup", version: "1.0.0" });
  server.registerTool(
    "draw",
    {
      description:
        "Change the map you plan with the owner, in one call: draw cards (new, or again by id), each with the cards it points to; take cards or arrows off; show the owner some cards or areas (their canvas moves there). A card is one thing: a short title, a line, an icon; or a picture from the project with a caption. Answers with what it did and the whole map.",
      inputSchema: {
        cards: z.array(card).optional(),
        remove: z.array(z.string()).optional(),
        disconnect: z
          .array(z.object({ from: z.string(), to: z.string() }))
          .optional(),
        show: z
          .object({
            cards: z.array(z.string()).optional(),
            areas: z.array(z.string()).optional(),
          })
          .optional(),
        ...(on.titled
          ? {
              title: z
                .string()
                .optional()
                .describe(
                  'The idea\'s title, a few words as on a to-do list ("Port weather for drivers"): give it once you understand the idea.',
                ),
            }
          : {}),
      },
    },
    (args) => answer(() => on.draw(args)),
  );
  const configure = on.configure;
  if (configure)
    server.registerTool(
      "configure",
      {
        description:
          "Only once the owner said to build the factory. Sets the factory's own settings, checked as they are saved: the project (its name and what it is; the first call makes the factory's folder), its products, where its work is tracked (none: the factory's own board, or the id of an add-on that tracks work), its add-ons, a settings group's values, and tools to install on this computer. Answers with what it did and what the factory's checks still find.",
        inputSchema: {
          project: z
            .object({ name: z.string().min(1), about: z.string().optional() })
            .optional(),
          products: z.array(product).optional(),
          tracker: z.string().optional(),
          addOns: z.array(z.string()).optional(),
          settings: z
            .record(z.string(), z.record(z.string(), z.string().nullable()))
            .optional()
            .describe(
              "By settings group id: its values by key (null: the default).",
            ),
          install: z.array(z.string()).optional().describe("Tools by id."),
        },
      },
      async (args) => answerAsync(() => configure(args)),
    );
  return server;
}

// A tool's answer: its lines, or why it was refused.
function answer(act: () => string): CallToolResult {
  try {
    return { content: [{ type: "text", text: act() }] };
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    return { content: [{ type: "text", text: error.message }], isError: true };
  }
}

async function answerAsync(
  act: () => Promise<string>,
): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: await act() }] };
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    return { content: [{ type: "text", text: error.message }], isError: true };
  }
}

// One request from the coach's Claude Code: a tool call and its answer.
export async function answerTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  on: ToolsFor,
  body: unknown,
): Promise<void> {
  if (incoming.headers[COACH_HEADER] !== on.token) {
    response.writeHead(403, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Only the setup coach." }));
    return;
  }
  const server = toolsFor(on);
  // No live stream from the server: each call is one request and answer.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  response.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(incoming, response, body);
}
