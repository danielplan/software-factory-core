// What the factory's own MCP servers share (the standard way to give Claude
// new actions): a tool's answer in short lines, or why it was refused, so
// the agent can correct itself; and one request answered by a server made
// for it.

import type { IncomingMessage, ServerResponse } from "node:http";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { Refused } from "./refused.ts";

// A tool's answer: its lines, or why it was refused.
export async function toolAnswer(
  act: () => string | Promise<string>,
): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: await act() }] };
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    return { content: [{ type: "text", text: error.message }], isError: true };
  }
}

// One request from an agent's Claude Code: a tool call and its answer. No
// live stream from the server: each call is one request and answer.
export async function answerMcp(
  incoming: IncomingMessage,
  response: ServerResponse,
  server: McpServer,
  body: unknown,
): Promise<void> {
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
