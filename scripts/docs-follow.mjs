// The docs follow the code: a branch that changes code (a package's src/ or
// bin/) and no docs (docs/, a README, AGENTS.md, a BLUEPRINT.md, the skills'
// guides, skills and templates) fails, unless one of its commits says why
// none need to change, in a line "Docs: none, because …". On main itself
// (nothing ahead of origin's main) there is nothing to check. The builder's
// branches get the same round before their pull request (knowledge-kept.ts);
// this one holds for everyone's.

import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const base = (() => {
  for (const ref of ["origin/main", "main"]) {
    try {
      return git("merge-base", "HEAD", ref);
    } catch {
      // no such branch here; try the next
    }
  }
  return null;
})();

if (base === null || base === git("rev-parse", "HEAD")) process.exit(0);

const changed = git("diff", "--name-only", `${base}...HEAD`)
  .split("\n")
  .filter(Boolean);
const code = changed.filter((file) =>
  /^packages\/[^/]+\/(src|bin)\//.test(file),
);
const docs = changed.filter(
  (file) =>
    /^docs\//.test(file) ||
    /(^|\/)(README|AGENTS|BLUEPRINT)[^/]*\.md$/.test(file) ||
    /^packages\/skills\/(guides|skills|templates)\//.test(file),
);
const said = git("log", "--format=%B", `${base}..HEAD`)
  .split("\n")
  .some((line) => /^Docs: none\b.+/i.test(line.trim()));

if (code.length === 0 || docs.length > 0 || said) process.exit(0);

process.stderr.write(
  `The docs do not follow the code: this branch changes ${String(code.length)} code file(s) and no docs.\n` +
    "Bring docs/ (or the README, AGENTS.md, a BLUEPRINT.md, or the guides) in line with what changed,\n" +
    'or say why none need to change in a commit message line: "Docs: none, because …".\n',
);
process.exit(1);
