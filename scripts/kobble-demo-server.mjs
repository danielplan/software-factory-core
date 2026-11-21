// Kobble's server as a product of Kobble's own factory (packages/server's
// product.json): this copy's server on a fresh demo project (a copy of
// examples/acme next to the repository, so the example stays untouched),
// on port 4300, where the page's dev server sends its /api requests.

import { spawn, spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const folder = `${repo}-demo-server`;

rmSync(folder, { recursive: true, force: true });
cpSync(join(repo, "examples", "acme"), folder, { recursive: true });
for (const args of [
  ["init", "-q", "-b", "main"],
  ["add", "-A"],
  [
    "-c",
    "user.name=Kobble",
    "-c",
    "user.email=kobble@localhost",
    "commit",
    "-qm",
    "Demo",
  ],
])
  spawnSync("git", args, { cwd: folder });

const server = spawn(
  process.execPath,
  [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    join(repo, "packages", "server", "bin", "software-factory.ts"),
    folder,
    "--port",
    "4300",
    "--no-open",
  ],
  { cwd: repo, stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
