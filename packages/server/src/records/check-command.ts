// software-factory check [folder]: the checks of the project's records, its
// factory's database (kobble.db) and its seed (kobble-seed.json), each where
// there is one. Nothing is made or changed. Each problem is said in a line,
// and the command fails when there is any.

import { resolve } from "node:path";

import { checkRecordsIn, findFactory } from "@software-factory/core";

type Out = (line: string) => void;

export function checkRecordsHere(
  from: string,
  folder: string | undefined,
  out: Out,
): number {
  const root = findFactory(resolve(from, folder ?? "."));
  if (!root) {
    out("There is no factory here: run it in a project.");
    return 1;
  }
  const { checked, problems } = checkRecordsIn(root);
  if (checked.length === 0) {
    out("There are no records yet: nothing to check.");
    return 0;
  }
  for (const problem of problems) out(problem);
  out(
    problems.length > 0
      ? `\n${String(problems.length)} problem(s) in the records.`
      : `The records hold (${checked.join(", ")}): every rule is kept.`,
  );
  return problems.length > 0 ? 1 : 0;
}
