import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { prepareTestDatabase } from "../scripts/database.ts";

// Every suite, with the real-database suites switched on and the coverage
// floor checked, in one cross-platform command. The tests run on this working
// copy's own test database, on the server .env.test names: made when missing,
// while the ones of copies that are gone are dropped.
const url = process.env.DATABASE_URL;
if (!url)
  throw new Error("Set DATABASE_URL in .env.test (see .env.test.example).");
const own = await prepareTestDatabase(url, process.cwd());

const vitest = join(
  dirname(createRequire(import.meta.url).resolve("vitest/package.json")),
  "vitest.mjs",
);
const child = spawn(process.execPath, [vitest, "run", "--coverage"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: own, TEST_DATABASE: "1" },
});
child.once("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
