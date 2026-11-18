// software-factory check [folder]: the checks of Kobble's files in the
// project's factory (factory/kobble/): that each fits, and that what each
// names is there; and the made-up world's situations, with each product's
// own check of them (its `checkWorld` command), run in its folder. Nothing
// is made or changed. Each problem is said in a line, and the command fails
// when there is any.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import {
  checkKobbleIn,
  findFactory,
  findProducts,
} from "@software-factory/core";

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
  const kobble = checkKobbleIn(root);
  const problems = [...kobble.problems, ...worldChecks(root)];
  const checked = kobble.checked || problems.length > 0;
  if (!checked) {
    out("There are no Kobble files yet: nothing to check.");
    return 0;
  }
  for (const problem of problems) out(problem);
  out(
    problems.length > 0
      ? `\n${String(problems.length)} problem(s) in Kobble's files.`
      : "Kobble's files hold (kobble/): every rule is kept.",
  );
  return problems.length > 0 ? 1 : 0;
}

// Each product's own check of its situations: what it said, when it failed.
function worldChecks(root: string): string[] {
  return findProducts(root).products.flatMap((product) => {
    const command = product.commands.checkWorld;
    if (!command) return [];
    const run = spawnSync(command, {
      cwd: product.folder,
      shell: true,
      encoding: "utf8",
    });
    if (run.status === 0) return [];
    const said = `${run.stdout}${run.stderr}`.trim();
    const how = said ? `:\n${said}` : ".";
    return [`${product.id}: its world check (${command}) failed${how}`];
  });
}
