// check-docs <folder> [--leave-out <folder>]…: the knowledge base's checks on
// a folder (default: the current one), leaving out the folders named (from
// it). Prints each problem with its file and line, and exits with 1 when
// there is any.

import { checkDocs } from "../src/index.ts";

const args = process.argv.slice(2);
const leftOut = args.flatMap((arg, at) =>
  args[at - 1] === "--leave-out" ? [arg.replace(/\/$/, "")] : [],
);
const root =
  args.find(
    (arg, at) => !arg.startsWith("--") && args[at - 1] !== "--leave-out",
  ) ?? ".";
const problems = await checkDocs(root, { leftOut });
for (const { file, line, message, hint } of problems) {
  const where = line ? `${file}:${String(line)}` : file;
  console.error(`${where}  ${hint ? "Hint: " : ""}${message}`);
}
const faults = problems.filter((p) => !p.hint);
if (faults.length > 0) {
  console.error(`\n${String(faults.length)} problem(s) in the docs.`);
  process.exitCode = 1;
} else {
  console.log(
    "Docs hold: links and anchors, written paths, page types, decision records, no orphans, no run headings.",
  );
}
