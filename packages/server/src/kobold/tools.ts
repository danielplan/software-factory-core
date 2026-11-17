// The kobold's own tools, served over MCP, one set for each job: sorting a
// signal (sort_signal), suggesting a real problem (suggest_real_problem),
// writing a team member's own idea with the story it assumes (write_idea),
// or reporting a problem a check-up found in the code (report_finding).
// Each reads and writes the records through the store, so every write is
// checked; what does not fit is said, so the kobold can correct itself.
// Only the job's own Claude Code has its token.

import type { IncomingMessage, ServerResponse } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { FINDING_INPUT, type FindingInput } from "../checks/findings.ts";
import { WRITE_IDEA_INPUT, type WriteIdea } from "../explore/own-idea.ts";
import { answerMcp, toolAnswer } from "../mcp.ts";
import {
  SORT_INPUT,
  type Sort,
  SUGGEST_INPUT,
  type Suggest,
} from "./writes.ts";

export const KOBOLD_HEADER = "x-kobold";

const TOOL_LINES: Record<string, string> = {
  sort_signal: "Putting it in its place",
  suggest_real_problem: "Suggesting a real problem",
  write_idea: "Writing the idea and its story",
  report_finding: "Writing down a problem it found",
};

// A line of what a job's Claude Code does, as a person sees it; null to
// skip.
export function plain(line: string): string | null {
  const tool = /^Using mcp__kobold__(\w+)/.exec(line)?.[1];
  if (tool) return TOOL_LINES[tool] ?? null;
  return /^(Reading|Searching|Looking)/.test(line) ? line : null;
}

// What a job's tools act on; each says what it did in a line.
export type JobTools =
  | { tool: "sort_signal"; act: (args: Sort) => string }
  | { tool: "suggest_real_problem"; act: (args: Suggest) => string }
  | { tool: "write_idea"; act: (args: WriteIdea) => string }
  | { tool: "report_finding"; act: (args: FindingInput) => string };

function serverFor(tools: JobTools): McpServer {
  const server = new McpServer({ name: "kobold", version: "1.0.0" });
  if (tools.tool === "sort_signal")
    server.registerTool(
      "sort_signal",
      {
        description:
          "Sort the signal you were given and put it in its place, in one call: what it is (sortedAs), the persona it sounds like and why, and where it goes: evidence in one scene of an existing story (a guessed scene becomes seen), a new story you write from it, Build (a bug or an update), answered (a plain question), or unsure. Answers with what it did, or why it does not fit.",
        inputSchema: SORT_INPUT,
      },
      (args) => toolAnswer(() => tools.act(args)),
    );
  else if (tools.tool === "report_finding")
    server.registerTool(
      "report_finding",
      {
        description:
          "Report one problem you found in the product's code, in one call: a plain title, what happens to a person, where it is (a file and line from the project's root, which must exist), its kind and severity, and what would fix it. Answers with what it kept, or why it does not fit.",
        inputSchema: FINDING_INPUT,
      },
      (args) => toolAnswer(() => tools.act(args)),
    );
  else if (tools.tool === "write_idea")
    server.registerTool(
      "write_idea",
      {
        description:
          "Write the team member's idea in one call: its title, what the team thinks it would do, the story it assumes behind it (every scene guessed, one breaks) and the problem it breaks at (assumed). Answers with what it wrote, or why it does not fit.",
        inputSchema: WRITE_IDEA_INPUT,
      },
      (args) => toolAnswer(() => tools.act(args)),
    );
  else
    server.registerTool(
      "suggest_real_problem",
      {
        description:
          "Suggest the real problem behind two or more problems of one persona that point the same way and have none yet. A person confirms it. Answers with what it did, or why it does not fit.",
        inputSchema: SUGGEST_INPUT,
      },
      (args) => toolAnswer(() => tools.act(args)),
    );
  return server;
}

// One request from a job's Claude Code; a token no job has is refused.
export async function answerKoboldTools(
  incoming: IncomingMessage,
  response: ServerResponse,
  body: unknown,
  toolsOf: (token: string) => JobTools | null,
): Promise<void> {
  const token = incoming.headers[KOBOLD_HEADER];
  const tools = typeof token === "string" ? toolsOf(token) : null;
  if (!tools) {
    response.writeHead(403, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Only the kobold, while it works." }));
    return;
  }
  await answerMcp(incoming, response, serverFor(tools), body);
}
