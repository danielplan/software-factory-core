// How the factory runs Claude Code unattended in a working copy: the
// settings of one run (one turn of a conversation) for any agent.

import type { ClaudeResult } from "./events.ts";

// The factory's programs own every GitHub write, so an agent may not push or
// use gh.
const DISALLOWED = [
  "Bash(gh *)",
  "Bash(gh)",
  "Bash(git push *)",
  "Bash(git push)",
  "PowerShell(gh *)",
  "PowerShell(git push *)",
];
const READ_ONLY = ["Edit", "Write", "MultiEdit", "NotebookEdit"];

export type RunOptions = {
  cwd: string;
  prompt: string;
  readOnly: boolean;
  onActivity: (line: string) => void;
  // Only these built-in tools, for example ["Read", "Grep", "Glob"], and no
  // MCP server beyond `mcp`.
  tools?: string[];
  // Start a conversation with this id, or continue it.
  session?: { id: string; resume: boolean };
  // The reply so far, while it is being written.
  onText?: (text: string) => void;
  timeLimitMs?: number;
  // A model other than the account's default, for example "sonnet".
  model?: string;
  // One MCP server over HTTP and no other (not even the account's own), whose
  // tools are allowed without asking.
  mcp?: { name: string; url: string; headers: Record<string, string> };
  // With readOnly: the one folder, outside the working copy, where Edit and
  // Write are allowed (an agent that reads one copy and changes another).
  editFolder?: string;
  // More tools it may not use, for example "Read(**/.env*)".
  deny?: string[];
  // Instructions added to Claude Code's own, kept for the whole conversation.
  instructions?: string;
};

// Claude Code's options for a run; `input` makes it take turns over standard
// input (see warm.ts).
export function claudeArgs(options: RunOptions, input = false): string[] {
  const disallowed = disallowedFor(options);
  const args = ["-p"];
  if (input) args.push("--input-format", "stream-json");
  args.push(
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-mode",
    "auto",
  );
  // Only the tools named, so no MCP server either (not even the account's
  // own, such as a browser), except the one given below.
  if (options.tools) args.push("--tools", options.tools.join(","));
  if (options.tools && !options.mcp) args.push("--strict-mcp-config");
  if (options.model) args.push("--model", options.model);
  if (options.mcp) args.push(...mcpArgs(options.mcp));
  if (options.editFolder) args.push("--add-dir", options.editFolder);
  args.push(...conversationArgs(options));
  // The prompt arrives on standard input, so the tool list can come last.
  args.push("--disallowedTools", ...disallowed);
  return args;
}

// The conversation: its id, its instructions, the reply while written.
function conversationArgs(options: RunOptions): string[] {
  const args: string[] = [];
  if (options.onText) args.push("--include-partial-messages");
  if (options.instructions)
    args.push("--append-system-prompt", options.instructions);
  if (options.session)
    args.push(
      options.session.resume ? "--resume" : "--session-id",
      options.session.id,
    );
  return args;
}

// The one MCP server, with its tools allowed without asking.
function mcpArgs({ name, url, headers }: NonNullable<RunOptions["mcp"]>) {
  return [
    "--mcp-config",
    JSON.stringify({ mcpServers: { [name]: { type: "http", url, headers } } }),
    "--strict-mcp-config",
    "--allowedTools",
    `mcp__${name}`,
  ];
}

// Read-only: no editing tool at all, or, with an edit folder, no editing
// inside the working copy itself (an Edit rule covers every editing tool;
// relative to it), so edits land only in that folder.
function disallowedFor(options: RunOptions): string[] {
  const deny = [...DISALLOWED, ...(options.deny ?? [])];
  if (!options.readOnly) return deny;
  if (!options.editFolder) return [...deny, ...READ_ONLY];
  return [...deny, "NotebookEdit", "Edit(./**)"];
}

// What an agent needs from Claude Code: one turn of a conversation (a real
// Claude Code, or a pretend one in the tests).
export interface Claude {
  run(options: RunOptions): Promise<ClaudeResult>;
}
