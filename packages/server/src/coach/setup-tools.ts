// The tools the setup coach draws the company's map with, served over MCP
// (the standard way to give Claude new actions). Each answers in a short
// sentence; a refused change answers why, so the coach can correct itself.
// When to use which tool is in the coach's guide (the method's
// guides/setup-coach.md).

import type { IncomingMessage, ServerResponse } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { detectProducts, type Kit } from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../refused.ts";
import type { DraftKeeper } from "./draft-keeper.ts";

// The header with the coach's token: only its Claude Code is given it.
export const COACH_HEADER = "x-setup-coach";

const users = z
  .array(z.object({ who: z.string().min(1), does: z.string().min(1) }))
  .describe(
    'Who uses it and what for, in the company\'s words: [{"who": "Customers", "does": "order garden tools"}].',
  );
const dependsOn = z
  .array(z.string())
  .describe(
    "The ids of the products it needs running (an app needs its backend).",
  );

// A tool's answer: its sentence, or why the change was refused.
function answer(act: () => string): CallToolResult {
  try {
    return { content: [{ type: "text", text: act() }] };
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    return { content: [{ type: "text", text: error.message }], isError: true };
  }
}

function toolsFor(keeper: DraftKeeper, kits: Kit[]): McpServer {
  const server = new McpServer({ name: "setup", version: "1.0.0" });
  companyTools(server, keeper, kits);
  productTools(server, keeper, kits);
  return server;
}

// The company, and what is on the map.
function companyTools(server: McpServer, keeper: DraftKeeper, kits: Kit[]) {
  server.registerTool(
    "set_company",
    {
      description:
        "Put the company's name and what it does, in a sentence, on the map.",
      inputSchema: {
        name: z.string().optional(),
        about: z.string().optional(),
      },
    },
    (args) => answer(() => keeper.setCompany(args)),
  );
  server.registerTool(
    "look_for_products",
    {
      description:
        "The products the kits recognise in a folder of existing code (a few levels down), with their kind, folder, name and commands. Changes nothing.",
      inputSchema: { folder: z.string().describe("A whole path.") },
    },
    ({ folder }) =>
      answer(() => JSON.stringify(detectProducts(folder, kits), null, 2)),
  );
  server.registerTool(
    "look_at_map",
    {
      description:
        "The map as it is now, with the owner's own changes: the company and every product with its id.",
      inputSchema: {},
    },
    () => answer(() => keeper.text()),
  );
}

// The products on the map.
function productTools(server: McpServer, keeper: DraftKeeper, kits: Kit[]) {
  const kinds = kits.map((kit) => kit.kind) as [string, ...string[]];
  server.registerTool(
    "add_product",
    {
      description:
        "Put a product on the map: one found in existing code (give its folder) or a new one, made with its kit's starter when the factory is made (no folder).",
      inputSchema: {
        name: z.string().describe('What people call it ("Shop").'),
        kind: z.enum(kinds),
        about: z.string().describe("What it is for, in a sentence."),
        users: users.optional(),
        folder: z.string().optional(),
        dependsOn: dependsOn.optional(),
      },
    },
    (args) => answer(() => keeper.add(args)),
  );
  server.registerTool(
    "change_product",
    {
      description: "Change a product on the map.",
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        about: z.string().optional(),
        users: users.optional(),
        dependsOn: dependsOn.optional(),
      },
    },
    (args) => answer(() => keeper.change(args)),
  );
  server.registerTool(
    "remove_product",
    {
      description: "Take a product off the map.",
      inputSchema: { id: z.string() },
    },
    ({ id }) => answer(() => keeper.remove(id)),
  );
  server.registerTool(
    "write_blueprint",
    {
      description:
        "Save a product's first blueprint, drafted from its code, for the owner to review later.",
      inputSchema: { id: z.string(), markdown: z.string() },
    },
    ({ id, markdown }) => answer(() => keeper.blueprint(id, markdown)),
  );
}

// One request from the coach's Claude Code: a tool call and its answer.
export async function answerTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  coach: { token: string; keeper: DraftKeeper; kits: Kit[] },
  body: unknown,
): Promise<void> {
  if (incoming.headers[COACH_HEADER] !== coach.token) {
    response.writeHead(403, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Only the setup coach." }));
    return;
  }
  const server = toolsFor(coach.keeper, coach.kits);
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
