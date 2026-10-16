// A pretend Claude Code for the setup coach's tests: each turn calls the
// tools it is given over MCP, as the real one does, then answers.

import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Claude, RunOptions } from "@software-factory/core";

type Call = [string, Record<string, unknown>];

// "<name>" in an argument is the path set in `paths` by then.
export function pretendClaude(turns: { calls: Call[]; reply: string }[]) {
  const paths: Record<string, string> = {};
  const filled = (args: Record<string, unknown>) =>
    JSON.parse(
      JSON.stringify(args).replace(/<(\w+)>/g, (_, name: string) =>
        JSON.stringify(paths[name] ?? "").slice(1, -1),
      ),
    ) as Record<string, unknown>;
  const seen: RunOptions[] = [];
  const answers: string[][] = [];
  const claude: Claude = {
    async run(options) {
      seen.push(options);
      const turn = turns[seen.length - 1];
      if (!turn) return { ok: false, text: "", error: "spawn claude ENOENT" };
      const mcp = options.mcp;
      assert.ok(mcp);
      const client = new Client({ name: "pretend", version: "1.0.0" });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(mcp.url), {
          requestInit: { headers: mcp.headers },
        }),
      );
      const said: string[] = [];
      for (const [name, args] of turn.calls) {
        options.onActivity(`Using mcp__setup__${name}`);
        const result = (await client.callTool({
          name,
          arguments: filled(args),
        })) as {
          content: { text: string }[];
        };
        said.push(result.content.map((c) => c.text).join(""));
      }
      await client.close();
      answers.push(said);
      options.onText?.(turn.reply.slice(0, 5));
      return { ok: true, text: turn.reply };
    },
  };
  return { claude, seen, answers, paths };
}
