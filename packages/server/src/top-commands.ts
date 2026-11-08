// The commands that answer and end, before the factory's server is started:
// help, and the knowledge base's checks in a project. A word that is neither
// a command nor a folder is said plainly instead of being taken for a folder.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { findFactory } from "@software-factory/core";

import { CARD_USAGE } from "./cards/command.ts";
import { checkKnowledge } from "./knowledge-check.ts";

export const USAGE = `software-factory [folder] [--port <port>] [--no-open]
                                             start the project's factory and open it
software-factory new <name>                  a folder for a new idea, set up there
software-factory check-docs                  the knowledge base's checks (docs/)
software-factory upgrade                     the project's factory, to this core's version
software-factory help                        this help
${CARD_USAGE}`;

type Out = (line: string) => void;

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
  if (first === "check-docs") return checkDocsHere(from, out);
  // Starting the factory, and the commands answered elsewhere (card, upgrade).
  if (first === undefined || ["new", "card", "upgrade"].includes(first))
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
