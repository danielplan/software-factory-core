import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const drizzleKit = join(
  dirname(createRequire(import.meta.url).resolve("drizzle-kit")),
  "bin.cjs",
);
const migrations = resolve("drizzle");
// drizzle-kit can report a failure with exit code 0, so only this answer counts as a match.
const noChanges = "No schema changes, nothing to migrate";

function drizzle(...args: string[]) {
  const run = spawnSync(process.execPath, [drizzleKit, ...args], {
    encoding: "utf8",
    // A schema change drizzle-kit cannot decide alone (a rename?) asks a question; nobody answers here.
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  });
  return { ok: run.status === 0, output: `${run.stdout}${run.stderr}` };
}

function sqlFiles(directory: string) {
  return readdirSync(directory).filter((name) => name.endsWith(".sql"));
}

const cache = join("node_modules", ".cache");
mkdirSync(cache, { recursive: true });
function compare(scratch: string) {
  const copy = join(scratch, "drizzle");
  cpSync(migrations, copy, { recursive: true });
  const config = join(scratch, "drizzle.config.ts");
  writeFileSync(
    config,
    'import config from "../../../drizzle.config.ts";\n' +
      // drizzle-kit prefixes "./" to the output folder, so it must be relative.
      `export default { ...config, out: ${JSON.stringify(copy)} };\n`,
  );

  const generate = drizzle("generate", "--config", config);
  const before = new Set(sqlFiles(migrations));
  const added = sqlFiles(copy).filter((name) => !before.has(name));
  if (!generate.output.includes(noChanges) || added.length > 0)
    return [
      generate.output,
      ...added.map((name) => readFileSync(join(copy, name), "utf8")),
      "The Drizzle schema and drizzle/ disagree. Run npm run db:generate and commit the new migration.",
    ];

  const check = drizzle("check");
  if (!check.ok)
    return [check.output, "drizzle-kit check found a problem in drizzle/."];
  return [];
}

const scratch = mkdtempSync(join(cache, "db-check-"));
try {
  const problems = compare(scratch);
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  } else console.log("drizzle/ matches the Drizzle schema.");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
