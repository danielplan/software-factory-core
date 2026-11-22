// The kobold's judgement of what was merged: do people have to do something
// (or does something they relied on change or go away)? Yes raises the
// middle number. It answers with the reason in one line, in the team's
// language. Asked only when the team prepares a release (never when the
// page is read), and once for the same work: the answer is kept until the
// merged pull requests change.

import { randomUUID } from "node:crypto";

import type { Claude } from "@software-factory/core";
import { z } from "zod";

import { inLanguage } from "../../language.ts";
import type { Merged } from "./notes.ts";

export type Judgement = { act: boolean; why: string };

const answerSchema = z.object({
  act: z.boolean(),
  why: z.string().trim().min(1),
});

const TIME_LIMIT_MS = 3 * 60_000;
const LONGEST_BODY = 800;

const RULE = [
  "You decide the number of a product's next release from the pull requests merged since the last one.",
  "Most releases raise only the last number (1.4.2 → 1.4.3), and that includes new things.",
  "The middle number goes up (1.4.3 → 1.5.0) only when people have to do something to take the release, or when something they relied on changes or goes away.",
  "Judge by what each pull request does for the people who use the product, not by how its title starts.",
  'Answer with JSON only: {"act": true or false, "why": "one short sentence in plain words"}.',
  'When act is false, why says it is only fixes and improvements (for example "Only fixes and improvements since 1.4.2, nothing to do for anyone").',
  'When act is true, why says what changes for people (for example "Something changes for people: the old export is gone").',
].join("\n");

export class Judge {
  private readonly claude: Claude;
  private readonly cwd: string;
  private readonly kept = new Map<string, Promise<Judgement | null>>();
  // The answers given, for reading without asking again.
  private readonly given = new Map<string, Judgement>();

  constructor(claude: Claude, cwd: string) {
    this.claude = claude;
    this.cwd = cwd;
  }

  // The judgement already given for this work, without asking for one.
  known(last: string | null, merged: Merged[]): Judgement | null {
    return this.given.get(keyOf(last, merged)) ?? null;
  }

  // The kobold's judgement, or none when it could not give one.
  judge(last: string | null, merged: Merged[]): Promise<Judgement | null> {
    const key = keyOf(last, merged);
    let found = this.kept.get(key);
    if (!found) {
      found = this.ask(last, merged);
      this.kept.clear();
      this.kept.set(key, found);
      // A failed try is asked again next time.
      void found.then((answer) => {
        if (answer) {
          this.given.clear();
          this.given.set(key, answer);
        } else if (this.kept.get(key) === found) this.kept.delete(key);
      });
    }
    return found;
  }

  private async ask(
    last: string | null,
    merged: Merged[],
  ): Promise<Judgement | null> {
    const listed = merged.map((one) =>
      [
        `- #${String(one.number)} ${one.title}`,
        one.body.trim().slice(0, LONGEST_BODY),
      ]
        .filter(Boolean)
        .join("\n"),
    );
    const result = await this.claude
      .run({
        cwd: this.cwd,
        prompt: [
          last ? `The last release is ${last}.` : "There is no release yet.",
          `Merged since:\n${listed.join("\n\n")}`,
        ].join("\n\n"),
        readOnly: true,
        tools: [],
        instructions: inLanguage(RULE),
        session: { id: randomUUID(), resume: false },
        timeLimitMs: TIME_LIMIT_MS,
        onActivity: () => {},
      })
      .catch(() => null);
    if (!result?.ok) return null;
    try {
      const start = result.text.indexOf("{");
      const end = result.text.lastIndexOf("}");
      return answerSchema.parse(JSON.parse(result.text.slice(start, end + 1)));
    } catch {
      return null;
    }
  }
}

function keyOf(last: string | null, merged: Merged[]): string {
  return JSON.stringify([last, merged.map((one) => one.number)]);
}
