// A new project's own checks at its top, as a company's factory keeps them:
// a package.json (private, with the core pinned in it by pin-core.ts, so
// everyone runs the same factory, and scripts that check every product and
// the knowledge base) and lefthook's git hooks: before a commit, the format
// check of each product with a staged file and the knowledge base's checks
// when a page changed; before a push, the verify command of each product the
// push changes. `npm install` at the top sets them up.
//
// A project that has a package.json already keeps its own: nothing is added
// to it here (only the core is pinned in it). One that has git hooks of its
// own (lefthook's settings, husky) keeps them.

import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { idFrom } from "@software-factory/core";

// lefthook's version, the one the core itself uses.
const LEFTHOOK = "2.2.1";

// Where a project keeps git hooks that are its own.
const OWN_HOOKS = [
  "lefthook.yml",
  "lefthook.yaml",
  ".lefthook.yml",
  ".lefthook.yaml",
  "lefthook.json",
  "lefthook.toml",
  ".husky",
];

const HOOKS_FILE = "lefthook.yml";

const HOOKS = `# The project's git hooks, run by lefthook (https://lefthook.dev). \`npm
# install\` at the top of the project sets them up. They check only what
# changed, with the factory's own commands. Never skip them with --no-verify.

pre-commit:
  jobs:
    # The format check of each product with a staged file.
    - name: format
      run: npx --no-install software-factory check-format {staged_files}
    # The knowledge base's checks, when a page changed.
    - name: docs
      glob: "**/*.md"
      run: npx --no-install software-factory check-docs

pre-push:
  jobs:
    # The verify command of each product the pushed commits change.
    - name: verify
      run: npx --no-install software-factory verify {push_files}
`;

// True when the checks were added: the project had no package.json.
export function addProjectChecks(project: string, name: string): boolean {
  const file = join(project, "package.json");
  if (existsSync(file)) return false;
  const hooks = !OWN_HOOKS.some((own) => existsSync(join(project, own)));
  const data = {
    name: idFrom(name),
    private: true,
    description:
      "The project's own checks and its software factory; each product keeps its own package.json.",
    type: "module",
    scripts: {
      ...(hooks ? { prepare: "lefthook install" } : {}),
      verify: "software-factory verify && npm run check:docs",
      "check:docs": "software-factory check-docs",
    },
    devDependencies: hooks ? { lefthook: LEFTHOOK } : {},
  };
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  if (hooks) writeFileSync(join(project, HOOKS_FILE), HOOKS);
  ignoreInstalled(project);
  return true;
}

// The packages installed at the top stay out of git.
function ignoreInstalled(project: string): void {
  const file = join(project, ".gitignore");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (/^\/?node_modules\/?$/m.test(text)) return;
  const before = text === "" || text.endsWith("\n") ? "" : "\n";
  appendFileSync(file, `${before}node_modules/\n`);
}
