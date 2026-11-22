// The posts of the public feedback board arriving as signals: in a factory
// that reads the board (`FACTORY_FEEDBACK_READS=yes` in `team.env`, the
// makers' own), every open post that is not this person's own becomes an
// ordinary signal with the source `feedback`, once, through Signals' plug
// (none arrive while Signals is not installed). The kobold then matches
// each new one to the persona of the product it fits best (Personas'
// plug), with a short reason; a post it is not sure about stays with none,
// and a person can change or remove a match.

import { randomUUID } from "node:crypto";

import {
  type Claude,
  type KobbleSignal,
  readSettings,
  TEAM_FILE,
} from "@software-factory/core";
import { z } from "zod";

import type { PersonasPlug } from "../plugs/personas.ts";
import type { NewSignal, SignalsPlug } from "../plugs/signals.ts";
import type { FeedbackBoard, Post } from "./board.ts";

export const READS_KEY = "FACTORY_FEEDBACK_READS";
export const sourceIdOf = (number: number) => `feedback-${String(number)}`;

const EVERY_MS = 10 * 60_000;
const MATCH_WITHIN_MS = 3 * 60_000;

const matchesSchema = z.object({
  matches: z.array(
    z.object({
      post: z.number(),
      persona: z.string().nullable(),
      why: z.string().optional(),
    }),
  ),
});

const INSTRUCTIONS = `You match posts from a public feedback board to the personas of a product. For each post, pick the persona it fits best: the kind of customer who would most likely have written it or gain most from it. Answer only with JSON: {"matches":[{"post":<number>,"persona":"<persona id or null>","why":"<one short reason, about 12 words, starting with 'they'>"}]}. Use null when you are not sure; a wrong match is worse than none. No team's private data in the reason.`;

type Options = {
  board: FeedbackBoard;
  signals: () => SignalsPlug | null;
  personas: () => PersonasPlug | null;
  claude: Claude;
  // The factory's folder (its team.env says whether it reads the board) and
  // where the kobold works.
  factory: string;
  cwd: string;
  onChange: () => void;
};

export class FeedbackArrivals {
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<number> | null = null;
  private readonly options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  // Whether this factory reads the board.
  reads(): boolean {
    return readSettings(this.options.factory, TEAM_FILE)[READS_KEY] === "yes";
  }

  start(): void {
    this.close();
    void this.read();
    this.timer = setInterval(() => {
      void this.read();
    }, EVERY_MS);
    this.timer.unref();
  }

  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // The new signals this read brought (none when the factory does not read
  // the board). One read at a time.
  read(): Promise<number> {
    this.running ??= this.once()
      .catch(() => 0)
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }

  private async once(): Promise<number> {
    const signals = this.options.signals();
    if (!signals || !this.reads()) return 0;
    const own = new Set(this.options.board.sent().map((one) => one.number));
    const known = new Set(signals.all().map((one) => one.sourceId));
    const fresh = (await this.options.board.posts()).filter(
      (post) =>
        post.state !== "done" &&
        !own.has(post.number) &&
        !known.has(sourceIdOf(post.number)),
    );
    if (fresh.length === 0) return 0;
    const added = signals.report(fresh.map(signalOf));
    this.options.onChange();
    await this.match(signals, added, fresh);
    this.options.onChange();
    return added.length;
  }

  // Asks the kobold which persona each new post fits; nothing is changed
  // when it cannot say.
  private async match(
    signals: SignalsPlug,
    added: KobbleSignal[],
    posts: Post[],
  ): Promise<void> {
    const personas = this.options.personas()?.all() ?? [];
    if (personas.length === 0) return;
    const result = await this.options.claude
      .run({
        cwd: this.options.cwd,
        prompt: [
          `The personas:\n${personas
            .map(
              (one) => `- ${one.id}: ${one.name}, ${one.place}. ${one.about}`,
            )
            .join("\n")}`,
          `The posts:\n${posts
            .map(
              (one) => `- #${String(one.number)} (${one.kind}): ${one.title}`,
            )
            .join("\n")}`,
        ].join("\n\n"),
        readOnly: true,
        tools: [],
        instructions: INSTRUCTIONS,
        session: { id: randomUUID(), resume: false },
        timeLimitMs: MATCH_WITHIN_MS,
        onActivity: () => {},
      })
      .catch(() => null);
    if (!result?.ok) return;
    const { matches } = readMatches(result.text);
    for (const match of matches) {
      const signal = added.find(
        (one) => one.sourceId === sourceIdOf(match.post),
      );
      const persona = personas.find((one) => one.id === match.persona);
      if (signal && persona)
        signals.change({
          ...signal,
          persona: persona.id,
          ...(match.why?.trim() ? { why: match.why.trim() } : {}),
        });
    }
  }
}

function readMatches(said: string): z.infer<typeof matchesSchema> {
  try {
    const start = said.indexOf("{");
    const end = said.lastIndexOf("}");
    return matchesSchema.parse(JSON.parse(said.slice(start, end + 1)));
  } catch {
    return { matches: [] };
  }
}

// The words of a post as a signal: its title and what the person wrote
// (not what went along with it).
function textOf(post: Post): string {
  const said = post.body.split(/\n---\n/)[0]?.trim() ?? "";
  return said && said !== post.title ? `${post.title}\n\n${said}` : post.title;
}

function signalOf(post: Post): NewSignal {
  return {
    type: post.kind === "bug" ? "bug" : "request",
    source: "feedback",
    sourceId: sourceIdOf(post.number),
    customer: post.by || null,
    persona: null,
    at: post.at,
    text: textOf(post),
    status: "new",
    to: null,
  };
}
