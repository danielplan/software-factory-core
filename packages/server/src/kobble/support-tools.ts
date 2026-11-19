// The support kobold's tools, served over MCP like the other kobolds': it
// looks at the personas, adds a persona the team describes to it, and adds
// an idea of the team's as an exploration that waits in Explorations. New
// persona and New exploration open its conversation instead of a form.
// Only its own Claude Code has the token.

import type { IncomingMessage, ServerResponse } from "node:http";

import type { KobbleStore } from "@software-factory/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { COACH_HEADER } from "../coach/setup-tools.ts";
import { answerMcp, toolAnswer } from "../mcp.ts";
import { addPersona } from "./actions.ts";
import { newExploration } from "./explorations/actions.ts";

export type SupportTools = {
  token: string;
  store: () => KobbleStore;
  // Told to the page: "personas" or "explorations".
  changed: (what: string) => void;
};

export function personasText(store: KobbleStore): string {
  const personas = store.all("personas");
  if (personas.length === 0) return "No personas yet.";
  return personas
    .map((one) => `- ${one.id}: ${one.name}, ${one.place}. ${one.about}`)
    .join("\n");
}

function serverFor(on: SupportTools): McpServer {
  const server = new McpServer({ name: "support", version: "1.0.0" });
  server.registerTool(
    "list_personas",
    { description: "The personas there are: id, name, where, who they are." },
    () => toolAnswer(() => personasText(on.store())),
  );
  server.registerTool(
    "add_persona",
    {
      description:
        "Adds a persona: a real kind of customer the team described. Only once the team agreed to what you will add.",
      inputSchema: {
        name: z.string().min(1).describe("A first name, or a role."),
        place: z
          .string()
          .describe("Where they work or live, a few words (Bakery, Milan)."),
        about: z
          .string()
          .describe(
            "Who they are and what they need from the app, two or three sentences.",
          ),
      },
    },
    (args) =>
      toolAnswer(() => {
        const persona = addPersona(on.store(), args);
        on.changed("personas");
        return `Added ${persona.name} (${persona.id}): #personas/${persona.id}`;
      }),
  );
  server.registerTool(
    "add_exploration",
    {
      description:
        "Adds a feature request or idea of the team's as an exploration waiting in Explorations › Waiting. Only once the team agreed to what you will add.",
      inputSchema: {
        title: z.string().min(1).describe("A few words."),
        problem: z
          .string()
          .describe(
            "The problem it solves and for whom, two or three sentences.",
          ),
        persona: z
          .string()
          .optional()
          .describe("A persona's id from list_personas, when one fits."),
      },
    },
    (args) =>
      toolAnswer(() => {
        const exploration = newExploration(on.store(), args);
        on.changed("explorations");
        return `Added ${exploration.id} “${exploration.title}”, waiting in Explorations.`;
      }),
  );
  return server;
}

export async function answerSupportTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  on: SupportTools,
  body: unknown,
): Promise<void> {
  if (incoming.headers[COACH_HEADER] !== on.token) {
    response.writeHead(403, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Only the support kobold." }));
    return;
  }
  await answerMcp(incoming, response, serverFor(on), body);
}
