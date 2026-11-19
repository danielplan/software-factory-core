// A pretend Claude Code for the tests of the coaches and the kobold: each
// turn calls the tools it is given over MCP, as the real one does, then
// answers.

import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Claude, RunOptions } from "@software-factory/core";

type Call = [string, Record<string, unknown>];

// "<name>" in an argument is the path set in `paths` by then. Calls given
// as a function are made when the turn comes (for what is known only then).
export function pretendClaude(
  turns: { calls: Call[] | (() => Call[]); reply: string }[],
) {
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
      const calls =
        typeof turn.calls === "function" ? turn.calls() : turn.calls;
      if (calls.length === 0 && !mcp) return { ok: true, text: turn.reply };
      assert.ok(mcp);
      const client = new Client({ name: "pretend", version: "1.0.0" });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(mcp.url), {
          requestInit: { headers: mcp.headers },
        }),
      );
      const said: string[] = [];
      for (const [name, args] of calls) {
        options.onActivity(`Using mcp__${mcp.name}__${name}`);
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

// Each answer in turn; a line "Step N: …" before the diary is written as
// the reply goes, as Claude Code does.
export function standIn(answers: (string | null)[]) {
  const seen: RunOptions[] = [];
  const claude: Claude = {
    run: (options) => {
      seen.push(options);
      const text = answers[seen.length - 1];
      if (text) for (const line of text.split("\n")) options.onText?.(line);
      return Promise.resolve(
        text === null || text === undefined
          ? { ok: false, text: "", error: "spawn claude ENOENT" }
          : { ok: true, text },
      );
    },
  };
  return { claude, seen };
}
