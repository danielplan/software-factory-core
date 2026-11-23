// Where each maker's own tool is served (maker-tools.ts): one token per
// prototype being made, the MCP its Claude Code is given, and whether the
// maker looked at its prototype by itself (then nobody makes it look again).

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Claude, Mcp, RunOptions } from "@software-factory/core";

export type MakerSession = { id: string; resume: boolean };
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

  // The conversation of each prototype's maker, while it makes it, and the
  // one kept from its last maker.
  private readonly sessions = new Map<string, string>();
  private readonly kept = new Map<string, string>();

  // The maker's conversation for the prototype: the one its makers had
  // before (continued, so it knows what was made and asked), also the one
  // saved with its copy before the server started again, or a new one.
  sessionFor(
    exploration: string,
    key: string,
    saved: string | null = null,
  ): MakerSession {
    const at = keyOf(exploration, key);
    const before = this.kept.get(at) ?? saved;
    const session = before
      ? { id: before, resume: true }
      : { id: randomUUID(), resume: false };
    this.sessions.set(at, session.id);
    return session;
  }

  // The maker went on in a new conversation (the old one could not be
  // continued): changes are told to it, and it is the one kept.
  use(exploration: string, key: string, session: string): void {
    this.sessions.set(keyOf(exploration, key), session);
  }

  // A change asked while the maker is on the prototype goes into what it does
  // now, so it is made in the same run instead of a new one after it; false
  // when it could not (then it waits).
  tell(
    claude: Claude,
    exploration: string,
    key: string,
    request: string,
  ): boolean {
    const session = this.sessions.get(keyOf(exploration, key));
    if (!session || !claude.tell) return false;
    return claude.tell(
      session,
      `The team asks for a change while you make this prototype; make it too, in this same run: ${request.trim()}`,
    );
  }

  // The maker is done, or stopped: its conversation is kept for the next
  // change; the conversation, to save with the copy.
  done(exploration: string, key: string): string | null {
    const at = keyOf(exploration, key);
    const session = this.sessions.get(at) ?? null;
    if (session) this.kept.set(at, session);
    this.sessions.delete(at);
    return session;
  }

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

// How a maker is asked, in one conversation: first to make the prototype
// (or change it, continuing its makers' conversation), then (resumed) to look
// and fix; in the prototype's copy, with the explore skill, its own tool and
// a browser, every step told. A conversation that cannot be continued
// starts anew.
export function askerFor(on: {
  claude: Claude;
  folder: string;
  model: string;
  session: MakerSession;
  mcp: RunOptions["mcp"];
  browser: Mcp | undefined;
  onStep: (line: string) => void;
  onFresh?: (session: string) => void;
  // What Tinker is told to do: the explore skill, unless another guide.
  instructions?: string;
}) {
  let session = on.session;
  const run = (prompt: string, resume: boolean) =>
    on.claude.run({
      model: on.model,
      cwd: on.folder,
      prompt,
      readOnly: false,
      deny: ["Read(**/.env*)"],
      instructions:
        on.instructions ??
        readFileSync(join(skillsFolder, "explore", "SKILL.md"), "utf8"),
      session: { id: session.id, resume },
      ...(on.mcp ? { mcp: on.mcp } : {}),
      ...(on.mcp && on.browser ? { alsoMcp: [on.browser] } : {}),
      timeLimitMs: TIME_LIMIT_MS,
      onActivity: on.onStep,
    });
  return async (prompt: string, resume: boolean) => {
    const answer = await run(prompt, resume || session.resume);
    if (answer.ok || resume || !session.resume) return answer;
    session = { id: randomUUID(), resume: false };
    on.onFresh?.(session.id);
    return await run(prompt, false);
  };
}
