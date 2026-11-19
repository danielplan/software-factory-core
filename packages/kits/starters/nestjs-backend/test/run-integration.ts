import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Every suite, with the real-database suite switched on and the coverage floor
// checked, in one cross-platform command.
const vitest = join(
  dirname(createRequire(import.meta.url).resolve("vitest/package.json")),
  "vitest.mjs",
);
const child = spawn(process.execPath, [vitest, "run", "--coverage"], {
  stdio: "inherit",
  env: { ...process.env, TEST_DATABASE: "1" },
});
child.once("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
