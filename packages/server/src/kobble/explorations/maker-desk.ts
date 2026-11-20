// Where each maker's own tool is served (maker-tools.ts): one token per
// prototype being made, the MCP its Claude Code is given, and whether the
// maker looked at its prototype by itself (then nobody makes it look again).

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Claude, RunOptions } from "@software-factory/core";
import { skillsFolder } from "@software-factory/skills";

import { COACH_HEADER } from "../../coach/setup-tools.ts";
import { Refused } from "../../refused.ts";
import type { Looks } from "./looks.ts";
import type { MakerTools } from "./maker-tools.ts";

const keyOf = (exploration: string, key: string) => `${exploration}/${key}`;

export class MakerDesk {
  private url = "";
  private readonly tokens = new Map<string, string>();
  private readonly looked = new Set<string>();
  // Changes asked while the maker was on the prototype, oldest first.
  private readonly asked = new Map<string, string[]>();

  wait(exploration: string, key: string, request: string): void {
    const at = keyOf(exploration, key);
    this.asked.set(at, [...(this.asked.get(at) ?? []), request.trim()]);
  }

  // The changes that waited, as one request (taken), or none.
  waiting(exploration: string, key: string): string | null {
    const at = keyOf(exploration, key);
    const asked = this.asked.get(at) ?? [];
    this.asked.delete(at);
    if (asked.length === 0) return null;
    return asked.length === 1
      ? (asked[0] ?? null)
      : asked.map((one, n) => `${String(n + 1)}. ${one}`).join("\n");
  }

  // Where the server answers the makers' tools (exploration and key added).
  serveAt(url: string): void {
    this.url = url;
  }

  // The tool a new maker of the prototype is given; none until served.
  mcpFor(exploration: string, key: string): RunOptions["mcp"] {
    if (!this.url) return undefined;
    const token = randomUUID();
    this.tokens.set(keyOf(exploration, key), token);
    this.looked.delete(keyOf(exploration, key));
    return {
      name: "prototype",
      url: `${this.url}/${exploration}/${key}`,
      headers: { [COACH_HEADER]: token },
    };
  }

  tools(
    exploration: string,
    key: string,
    look: MakerTools["look"],
  ): MakerTools {
    const token = this.tokens.get(keyOf(exploration, key));
    if (!token) throw new Refused(`Nobody makes ${exploration} ${key} now.`);
    return {
      token,
      look: async (want): Promise<Looks> => {
        this.looked.add(keyOf(exploration, key));
        return await look(want);
      },
    };
  }

  hasLooked(exploration: string, key: string): boolean {
    return this.looked.has(keyOf(exploration, key));
  }
}

const TIME_LIMIT_MS = 60 * 60_000;

// How a maker is asked, in one conversation: first to make the prototype,
// then (resumed) to look and fix; in the prototype's copy, with the explore
// skill and its own tool, every step told.
export function askerFor(on: {
  claude: Claude;
  folder: string;
  mcp: RunOptions["mcp"];
  onStep: (line: string) => void;
}) {
  const session = randomUUID();
  return (prompt: string, resume: boolean) =>
    on.claude.run({
      cwd: on.folder,
      prompt,
      readOnly: false,
      deny: ["Read(**/.env*)"],
      instructions: readFileSync(
        join(skillsFolder, "explore", "SKILL.md"),
        "utf8",
      ),
      session: { id: session, resume },
      ...(on.mcp ? { mcp: on.mcp } : {}),
      timeLimitMs: TIME_LIMIT_MS,
      onActivity: on.onStep,
    });
}
