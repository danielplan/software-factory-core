// The commands that answer and end, before the factory's server is started:
// help, and the checks of a project's records and knowledge base. A word
// that is neither a command nor a folder is said plainly instead of being
// taken for a folder.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { findFactory } from "@software-factory/core";
import { allKits } from "@software-factory/kits";

import { CARD_USAGE } from "./cards/command.ts";
import { PROTOTYPE_USAGE } from "./prototypes/command.ts";
import { checkKnowledge } from "./knowledge-check.ts";
import { checkRecordsHere } from "./check-command.ts";
import { rulesHere } from "./rules-command.ts";
import { checkFormatHere, verifyHere, verifyPushed } from "./verify-command.ts";

export const USAGE = `software-factory [folder] [--port <port>] [--no-open] [--local]
                                             start the project's factory and open it
                                             (your iPad on this network too, with its key; --local: only here)
software-factory new <name>                  a folder for a new idea, set up there
software-factory check [folder]              the checks of Kobble's files (factory/kobble/)
software-factory check-docs                  the knowledge base's checks (docs/)
software-factory rules [product]             the rules of a product's kit: conventions, libraries, lessons
software-factory verify [file…] [--pushed]   each product's verify command (with files: the products they are in;
                                             --pushed: the ones a push changes, from git's pre-push input)
software-factory check-format [file…]        each product's format check (with files: the products they are in)
software-factory upgrade                     the project's factory, to this core's version
software-factory help                        this help
${CARD_USAGE}
${PROTOTYPE_USAGE}`;

type Out = (line: string) => void;

// The commands answered here, by their first word: the checks, and the rules.
const ANSWERED = new Map<
  string,
  (
    from: string,
    rest: string[],
    out: Out,
    args: string[],
  ) => number | Promise<number>
>([
  ["check-docs", (from, _rest, out) => checkDocsHere(from, out)],
  ["check", (from, rest, out) => checkRecordsHere(from, rest[0], out)],
  ["rules", (from, rest, out) => rulesHere(from, rest[0], allKits, out)],
  [
    "verify",
    (from, rest, out, args) =>
      args.includes("--pushed")
        ? verifyPushed(from, readInput(), allKits, out)
        : verifyHere(from, rest, allKits, out),
  ],
  ["check-format", (from, rest, out) => checkFormatHere(from, rest, out)],
]);

// Answers a command that ends here; its exit code, or null when the server
// should start (a folder, `new`, nothing).
export async function topCommand(
  args: string[],
  from = process.cwd(),
  out: Out = (line) => {
    process.stdout.write(`${line}\n`);
  },
): Promise<number | null> {
  const { positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: { port: { type: "string" }, "no-open": { type: "boolean" } },
  });
  const [first] = positionals;
  if (args.includes("--help") || args.includes("-h") || first === "help") {
    out(USAGE);
    return 0;
  }
  const answer = first === undefined ? undefined : ANSWERED.get(first);
  if (answer) return answer(from, positionals.slice(1), out, args);
  // Starting the factory, and the commands answered elsewhere (card, upgrade).
  if (
    first === undefined ||
    ["new", "card", "prototype", "upgrade"].includes(first)
  )
    return null;
  if (existsSync(resolve(from, first))) return null;
  out(`There is no command or folder “${first}”.\n\n${USAGE}`);
  return 1;
}

// The checks of the project's knowledge base (its docs/).
async function checkDocsHere(from: string, out: Out): Promise<number> {
  const factory = findFactory(from);
  if (!factory) {
    out("There is no factory here: run it in a project.");
    return 1;
  }
  const { faults, hints } = await checkKnowledge(factory);
  for (const fault of faults) out(fault);
  for (const hint of hints) out(`Hint: ${hint}`);
  out(
    faults.length > 0
      ? `\n${String(faults.length)} problem(s) in the knowledge base.`
      : "The knowledge base holds: links, written paths, page types, decision records, no orphans.",
  );
  return faults.length > 0 ? 1 : 0;
}

// What the command was given on its standard input (git's lines for a hook);
// nothing when there is none.
function readInput(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}
