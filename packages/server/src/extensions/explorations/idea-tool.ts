// The explorer's tool for another idea that comes up in an exploration: it
// is parked as an exploration of its own, waiting, as Sprocket parks one.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toolAnswer } from "../../mcp.ts";

// Another idea that came up, parked as an exploration of its own.
export function addIdeaTool(
  server: McpServer,
  addIdea: (idea: { title: string; problem: string }) => string,
) {
  server.registerTool(
    "add_exploration",
    {
      description:
        "Parks another idea that came up (not this exploration's) as an exploration of its own, waiting in Explorations › Waiting, as Sprocket does. Only once the team agreed to what you will add; then say it is parked, with its id.",
      inputSchema: {
        title: z.string().min(1).describe("A few words."),
        problem: z
          .string()
          .describe(
            "The problem it solves and for whom, two or three sentences, with what was said about it here.",
          ),
      },
    },
    (args) => toolAnswer(() => addIdea(args)),
  );
}
