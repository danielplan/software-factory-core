// The maker's own tool, served over MCP like the other kobolds': it looks
// at the prototype it is making, running, as the team will see it: started
// when it does not run yet, photographed on its page (or one the maker
// names), for one variant or each. The answer names the pictures, which the
// maker reads. Only the maker of that prototype has the token.

import type { IncomingMessage, ServerResponse } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { COACH_HEADER } from "../../coach/setup-tools.ts";
import { answerMcp, toolAnswer } from "../../mcp.ts";
import type { Looks } from "./looks.ts";

export type MakerTools = {
  token: string;
  look: (want: { variant?: string; page?: string }) => Promise<Looks>;
};

// What the maker is told of what it looked at.
export function lookedWords({
  pictures,
  problem,
  addresses = [],
}: Looks): string {
  if (pictures.length === 0)
    return `It could not be looked at: ${problem ?? "no picture was taken"}.`;
  return [
    "Pictures of your prototype as it runs now (read each one):",
    ...pictures.map((file) => `- ${file}`),
    problem ? `Not every picture could be taken: ${problem}` : "",
    addresses.length > 0
      ? `It runs at ${addresses.join(" and ")}. With your browser tools, open it there and go through what people will do (click, type, wait for answers): what jumps, repeats or gets stuck shows only that way.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function serverFor(on: MakerTools): McpServer {
  const server = new McpServer({ name: "prototype", version: "1.0.0" });
  server.registerTool(
    "look_at_prototype",
    {
      description:
        "Look at your prototype as the team will see it: started if it does not run yet, and photographed on the page it opens on (or the page you name), one picture per variant unless you name one. Read the pictures it names. Use it after each change people can see, and fix what does not show what was asked.",
      inputSchema: {
        variant: z.string().optional().describe("One variant (A, B …)."),
        page: z
          .string()
          .regex(/^[/#?]/)
          .optional()
          .describe("Another page: a path (/orders) or #page (#build)."),
      },
    },
    (args) =>
      toolAnswer(async () =>
        lookedWords(
          await on.look({
            ...(args.variant ? { variant: args.variant } : {}),
            ...(args.page ? { page: args.page } : {}),
          }),
        ),
      ),
  );
  return server;
}

export async function answerMakerTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  on: MakerTools,
  body: unknown,
): Promise<void> {
  if (incoming.headers[COACH_HEADER] !== on.token) {
    response.writeHead(403, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Only this prototype's maker." }));
    return;
  }
  await answerMcp(incoming, response, serverFor(on), body);
}
