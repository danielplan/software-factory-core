// The tools the setup coach draws the project's canvas with, served over MCP
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

import { ICONS } from "../api.ts";
import { Refused } from "../refused.ts";
import type { DraftKeeper } from "./draft-keeper.ts";
import { historyOf } from "./history.ts";

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

// One card in a drawing (the draw tool).
const card = z.object({
  key: z
    .string()
    .optional()
    .describe("A name for a new card, to draw arrows to it in this call."),
  id: z.string().optional().describe("A card to write again (it is replaced)."),
  area: z.string().min(1),
  title: z.string().min(1),
  text: z.string().optional().describe("At most one short line."),
  icon: z.enum(ICONS).optional(),
  picture: z
    .string()
    .optional()
    .describe(
      "A picture's path inside the project (png, jpg, webp or gif); the title is its caption.",
    ),
  tone: z
    .enum(["rule", "question"])
    .optional()
    .describe("A rule (what must never happen) or a question (still open)."),
  from: z.enum(["code", "owner"]),
});

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
  contextTools(server, keeper);
  agreementTools(server, keeper);
  installTools(server, keeper);
  return server;
}

// The company, and what is on the canvas.
function companyTools(server: McpServer, keeper: DraftKeeper, kits: Kit[]) {
  server.registerTool(
    "set_company",
    {
      description:
        'Put the project on the canvas (its id is "company"): its name (a working name you propose is fine) and its vision in a sentence.',
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
    "look_at_canvas",
    {
      description:
        "The draft as it is now, with the owner's own changes: the company, the products, the cards, arrows and installs, each with its id.",
      inputSchema: {},
    },
    () => answer(() => keeper.text()),
  );
}

// The products on the canvas.
function productTools(server: McpServer, keeper: DraftKeeper, kits: Kit[]) {
  const kinds = kits.map((kit) => kit.kind) as [string, ...string[]];
  server.registerTool(
    "add_product",
    {
      description:
        "Put a product on the canvas: one found in existing code (give its folder) or a new one, made with its kit's starter when the factory is made (no folder).",
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
      description: "Change a product on the canvas.",
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
    "remove",
    {
      description:
        "Take a product, card or install off the draft, with its arrows.",
      inputSchema: { id: z.string() },
    },
    ({ id }) => answer(() => keeper.removeAny(id)),
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

// The context around the products: what the code cannot tell, guessed
// from the code and its history first, then asked.
function contextTools(server: McpServer, keeper: DraftKeeper) {
  server.registerTool(
    "look_at_history",
    {
      description:
        "What the git history of a folder says: how old the project is, how busy each month, who made the changes, its versions and its latest changes. Changes nothing.",
      inputSchema: { folder: z.string().describe("A whole path.") },
    },
    ({ folder }) => answer(() => historyOf(folder)),
  );
  server.registerTool(
    "draw",
    {
      description:
        'Draw small cards and the arrows between them, as many as you like in one call. A card is one thing, in an area you name (cards in the same area are framed together): a short title, at most one short line, and an icon; or a picture from the project with a caption. Mark a rule or a question with its tone and put it beside what it is about, with an arrow. Arrows show steps in order, who uses what, and what a rule or question is about; their ends are card ids or the keys of cards in this call. from "code" is your guess (shown as unconfirmed until the owner agrees); from "owner" is what they told you.',
      inputSchema: {
        cards: z.array(card).default([]),
        arrows: z
          .array(
            z.object({
              from: z.string(),
              to: z.string(),
              label: z.string().optional(),
            }),
          )
          .optional(),
      },
    },
    (args) => answer(() => keeper.draw(args)),
  );
  server.registerTool(
    "focus",
    {
      description:
        "Point the owner to what you are talking about: their canvas moves to those cards (by id) or areas (by name) and shows them. Use it whenever you ask about something particular, or have just drawn an area.",
      inputSchema: {
        ids: z.array(z.string()).optional(),
        areas: z.array(z.string()).optional(),
      },
    },
    (args) => answer(() => keeper.focus(args)),
  );
  server.registerTool(
    "disconnect",
    {
      description: "Take an arrow off the canvas.",
      inputSchema: { id: z.string() },
    },
    ({ id }) => answer(() => keeper.disconnect(id)),
  );
}

// What the owner agreed to.
function agreementTools(server: McpServer, keeper: DraftKeeper) {
  server.registerTool(
    "settle",
    {
      description:
        "Mark things the owner agreed to (the company, products, whole cards): drawn solid instead of as a sketch. settled false makes them a sketch again.",
      inputSchema: {
        ids: z.array(z.string()).min(1),
        settled: z.boolean().default(true),
      },
    },
    ({ ids, settled }) => answer(() => keeper.settle(ids, settled)),
  );
}

// What the factory needs installed: proposed by the coach, approved by the
// owner, installed when the factory is made.
function installTools(server: McpServer, keeper: DraftKeeper) {
  server.registerTool(
    "look_at_computer",
    {
      description:
        "What the factory can install (tools on this computer and add-ons for the factory), and which are here already. Changes nothing.",
      inputSchema: {},
    },
    () =>
      answer(() =>
        keeper.installables
          .map(
            (i) =>
              `- ${i.id} (${i.kind}): ${i.name}. ${i.about} ${i.present() ? "On this computer already." : "Not here yet."}`,
          )
          .join("\n"),
      ),
  );
  server.registerTool(
    "propose_install",
    {
      description:
        "Propose to install one thing from look_at_computer, saying why in a sentence the owner understands. It appears on the canvas for the owner to approve; nothing is installed until the factory is made.",
      inputSchema: { what: z.string(), why: z.string().min(1) },
    },
    (args) => answer(() => keeper.propose(args)),
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
