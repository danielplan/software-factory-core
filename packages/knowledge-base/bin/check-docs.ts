// check-docs <folder> [--leave-out <folder>]… [--knowledge-base <folder>]…:
// the knowledge base's checks on a folder (default: the current one),
// leaving out the folders named with --leave-out and holding the folders
// named with --knowledge-base (from it) to the knowledge base's rules and
// shape. Prints each problem with its file and line, and exits with 1 when
// there is any.

import { checkDocs } from "../src/index.ts";

const args = process.argv.slice(2);
const OPTIONS = ["--leave-out", "--knowledge-base"];
const named = (option: string): string[] =>
  args.flatMap((arg, at) =>
    args[at - 1] === option ? [arg.replace(/\/$/, "")] : [],
  );
const root =
  args.find(
    (arg, at) => !arg.startsWith("--") && !OPTIONS.includes(args[at - 1] ?? ""),
  ) ?? ".";
const problems = await checkDocs(root, {
  leftOut: named("--leave-out"),
  knowledgeBases: named("--knowledge-base"),
});
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
