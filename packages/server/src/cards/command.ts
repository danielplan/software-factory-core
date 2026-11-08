// software-factory card …: the board's cards for the coding agents (and the
// owner) in the project, so planning happens where the code is: pick a card,
// move it to planning, plan it with the owner (prototypes on its branch),
// and once the owner agrees, write the plan into the card and move it to
// ready, where the factory's builder takes it, on whichever computer runs it.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import { findFactory } from "@software-factory/core";
import { GIT } from "@software-factory/knowledge-base";

import { type Cli, realCli } from "../add-ons/github/github.ts";
import { Refused } from "../refused.ts";
import {
  type Card,
  type Cards,
  type Related,
  stageNamed,
  stageWord,
} from "./cards.ts";
import { cardsFor } from "./cards-for.ts";

export const CARD_USAGE = `software-factory card list [stage]          the board's cards, with their stage
software-factory card show <number>          a card: its text, comments, agreed plan
software-factory card new <title> [--body-file <file>] [--found-while <number>]
                                             a new card in the backlog (something noticed
                                             while working on another card links back to it)
software-factory card move <number> <stage>  backlog, planning, ready, doing, review, done
software-factory card comment <number> --body <text> | --body-file <file>
software-factory card depends <number> --on <number>
                                             the card is built only after the other one
software-factory card replace <number> --by <number>
                                             the card is not needed: the other one does it
                                             (closed with a note on both, still findable)
software-factory card agree <number> --plan-file <file> [--prototype <branch>]
                                             the plan the owner agreed to, into the card,
                                             which moves to ready for the factory's builder`;

type Out = (line: string) => void;

// Runs one card command; its exit code.
export async function cardCommand(
  args: string[],
  from = process.cwd(),
  cli: Cli = realCli(),
  out: Out = (line) => {
    process.stdout.write(`${line}\n`);
  },
): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        "plan-file": { type: "string" },
        "body-file": { type: "string" },
        body: { type: "string" },
        prototype: { type: "string" },
        "found-while": { type: "string" },
        on: { type: "string" },
        by: { type: "string" },
      },
    });
    const [verb = "help", ...rest] = positionals;
    if (verb === "help") {
      out(CARD_USAGE);
      return 0;
    }
    const { cards, project } = cardsHere(from, cli);
    await run(verb, rest, values, { cards, project, cli, out });
    return 0;
  } catch (error) {
    out(problemOf(error));
    return 1;
  }
}

type Options = {
  "plan-file"?: string;
  "body-file"?: string;
  body?: string;
  prototype?: string;
  "found-while"?: string;
  on?: string;
  by?: string;
};
type Context = { cards: Cards; project: string; cli: Cli; out: Out };

async function run(
  verb: string,
  rest: string[],
  options: Options,
  context: Context,
): Promise<void> {
  const command = VERBS[verb];
  if (!command)
    throw new Refused(`There is no card command “${verb}”.\n\n${CARD_USAGE}`);
  await command(rest, options, context);
}

type Verb = (
  rest: string[],
  options: Options,
  context: Context,
) => Promise<void>;

// Each card command.
const VERBS: Record<string, Verb | undefined> = {
  list: async (rest, _options, { cards, out }) => {
    const stage = rest[0] ? stageOrRefuse(rest[0]) : null;
    const listed = (await cards.list()).filter(
      (card) => !stage || card.stage === stage,
    );
    out(listed.length > 0 ? listed.map(line).join("\n") : "No cards.");
  },
  show: async (rest, _options, { cards, out }) => {
    const card = await cards.show(numberOf(rest[0]));
    out(
      [
        line(card),
        card.agreed ? "Has an agreed plan." : "No agreed plan yet.",
        ...relations("Depends on", card.dependsOn),
        ...relations("Needed by", card.neededBy),
        "",
        card.body.trim() || "(no text)",
        ...card.comments.map((c) => `\n— ${c.author}:\n${c.body.trim()}`),
      ].join("\n"),
    );
  },
  new: async (rest, options, { cards, out }) => {
    const title = rest.join(" ").trim();
    if (!title) throw new Refused("Give the card a title.");
    const found = options["found-while"];
    const from = found === undefined ? null : numberOf(found);
    const made = await cards.create(
      title,
      withFoundWhile(textOf(options), from),
    );
    if (from !== null)
      await cards.comment(
        from,
        `Noticed while working on this: #${String(made.number)}.`,
      );
    out(line(made));
  },
  depends: async (rest, options, { cards, out }) => {
    const number = numberOf(rest[0]);
    const on = numberOf(options.on);
    await cards.dependOn(number, on);
    out(
      `#${String(number)} now depends on #${String(on)}: it is built after it.`,
    );
  },
  replace: async (rest, options, { cards, out }) => {
    const number = numberOf(rest[0]);
    const by = numberOf(options.by);
    await cards.replace(number, by);
    out(
      `#${String(number)} is closed: #${String(by)} does it now. Both say so.`,
    );
  },
  move: async (rest, _options, { cards, out }) => {
    const number = numberOf(rest[0]);
    const stage = stageOrRefuse(rest[1] ?? "");
    await cards.move(number, stage);
    out(`Moved #${String(number)} to ${stageWord(stage)}.`);
  },
  comment: async (rest, options, { cards, out }) => {
    const number = numberOf(rest[0]);
    await cards.comment(number, textOf(options));
    out(`Commented on #${String(number)}.`);
  },
  agree: (rest, options, context) => agree(numberOf(rest[0]), options, context),
};

// The owner agreed: the plan (with its prototype's branch, pushed, and who
// agreed when) goes into the card, which moves to ready.
async function agree(
  number: number,
  options: Options,
  { cards, project, cli, out }: Context,
): Promise<void> {
  const file = options["plan-file"];
  if (!file) throw new Refused("Give the agreed plan: --plan-file <file>.");
  const plan = readFileSync(file, "utf8").trim();
  if (!plan) throw new Refused("The plan file is empty.");
  const branch = options.prototype?.trim();
  if (branch && !pushed(project, branch))
    throw new Refused(
      `The prototype's branch ${branch} is not on the repository yet: push it (git push -u origin ${branch}), then agree again.`,
    );
  const who = await loginOf(cli);
  const date = new Date().toISOString().slice(0, 10);
  await cards.writePlan(
    number,
    [
      plan,
      "",
      branch
        ? `**Prototype:** branch \`${branch}\`, to build on.`
        : "**Prototype:** none.",
      `**Agreed by:** ${who ?? "the owner"}, ${date}.`,
    ].join("\n"),
  );
  await cards.move(number, "todo");
  out(
    `#${String(number)} has its agreed plan and is ready: the factory's builder takes it from there.`,
  );
}

// The cards of the board the factory here is connected to.
function cardsHere(from: string, cli: Cli): { cards: Cards; project: string } {
  const root = findFactory(from);
  if (!root)
    throw new Refused("There is no factory here: run it in a project.");
  const found = cardsFor(root, cli);
  if ("problem" in found) throw new Refused(found.problem);
  return { cards: found.cards, project: dirname(root) };
}

// A card as one line: its number, its stage, its title, what it waits for.
function line(card: Card): string {
  const column = card.stage ? stageWord(card.stage) : card.column;
  const waits =
    card.waitsFor.length > 0
      ? `  (waits for ${card.waitsFor.map(ref).join(", ")})`
      : "";
  return `${ref(card.number)}  ${column || "(no column)"}  ${card.title}${waits}  ${card.url}`;
}

// A card's relations of one kind, in a line; nothing when it has none.
function relations(heading: string, related: Related[]): string[] {
  if (related.length === 0) return [];
  return [`${heading}: ${related.map(relatedLine).join(" · ")}`];
}

function relatedLine(card: Related): string {
  const done = card.closed ? " (done)" : "";
  return `${ref(card.number)} ${card.title}${done}`;
}

function ref(number: number): string {
  return `#${String(number)}`;
}

// The new card's text, saying which card it was noticed on.
function withFoundWhile(text: string, from: number | null): string {
  const said = text.trim();
  if (from === null) return said;
  const found = `Found while working on ${ref(from)}.`;
  return said ? `${said}\n\n${found}` : found;
}

// What went wrong, in a line: what the factory refused, or anything else
// that failed (never a crash).
function problemOf(error: unknown): string {
  if (error instanceof Refused || error instanceof TypeError)
    return error.message;
  const message = error instanceof Error ? error.message : String(error);
  return `Something went wrong: ${message}`;
}

function numberOf(text: string | undefined): number {
  const number = Number(text?.replace(/^#/, ""));
  if (!Number.isInteger(number) || number <= 0)
    throw new Refused("Give the card's number.");
  return number;
}

function stageOrRefuse(name: string) {
  const stage = stageNamed(name);
  if (!stage)
    throw new Refused(
      `“${name}” is not a stage: backlog, planning, ready, doing, review or done.`,
    );
  return stage;
}

function textOf(options: Options): string {
  const file = options["body-file"];
  if (file) return readFileSync(file, "utf8");
  return options.body ?? "";
}

// Whether the branch is on the repository's origin. Git never waits for a
// password here (it would hang the command): it answers within half a minute.
function pushed(project: string, branch: string): boolean {
  const ran = spawnSync(
    GIT,
    ["-C", project, "ls-remote", "--heads", "origin", branch],
    {
      encoding: "utf8",
      timeout: 30_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    },
  );
  return ran.status === 0 && ran.stdout.trim().length > 0;
}

async function loginOf(cli: Cli): Promise<string | null> {
  const ran = await cli.run(["api", "user", "--jq", ".login"]);
  return ran.code === 0 ? ran.out.trim() || null : null;
}
