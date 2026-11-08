// Publishes the core's version as a release projects install from this
// repository: node scripts/publish-release.mjs [--push]
//
// Builds it (build-release.mjs) into a working copy of the release branch
// (.release/, made once), commits it as "Release <version>" and tags it
// release-<version>; with --push, pushes the branch and the tag. A project
// then pins github:<owner>/software-factory-core#release-<version>.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const here = resolve(import.meta.dirname, "..");
const copy = join(here, ".release");
const push = process.argv.includes("--push");
const version = /CORE_VERSION = "([^"]+)"/.exec(
  readFileSync(join(here, "packages/core/src/version.ts"), "utf8"),
)?.[1];
if (!version)
  throw new Error("No CORE_VERSION in packages/core/src/version.ts");
const tag = `release-${version}`;

const git = (args, cwd = here) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const has = (args) => {
  try {
    git(args);
    return true;
  } catch {
    return false;
  }
};

if (has(["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`]))
  throw new Error(`${tag} is there already: raise CORE_VERSION first.`);

// The working copy of the release branch: made once, the branch made once.
if (!existsSync(copy)) git(["worktree", "add", "--detach", copy]);
if (has(["rev-parse", "--verify", "--quiet", "refs/heads/release"]))
  git(["checkout", "release"], copy);
else {
  git(["checkout", "--orphan", "release"], copy);
  git(["rm", "-rf", "--quiet", "."], copy);
}

execFileSync("node", [join(here, "scripts", "build-release.mjs"), copy], {
  cwd: here,
  stdio: "inherit",
});
// The bundled packages are in node_modules on purpose.
git(["add", "-A", "-f", "."], copy);
git(["commit", "--quiet", "-m", `Release ${version}`], copy);
git(["tag", "-a", tag, "-m", `Release ${version}`], copy);
if (push) {
  git(["push", "--quiet", "origin", "release"], copy);
  git(["push", "--quiet", "origin", tag], copy);
}
process.stdout.write(
  `Released ${version} as ${tag}${push ? ", pushed" : " (not pushed: --push)"}.\n`,
);
