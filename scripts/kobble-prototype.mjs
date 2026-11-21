// Kobble's prototype start command (factory/factory.json), run in the
// prototype's own copy of the core: that copy's server on a demo project
// (a fresh copy of examples/acme, next to the copy), and Vite serving the
// copy's page with its data requests sent to that server, so every change
// the kobold makes shows within a second. Prints FACTORY_URL=… once the
// page answers; runs until the factory stops it.

import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

const copy = process.env.FACTORY_COPY ?? process.cwd();
const project = process.env.FACTORY_PROJECT;

// The packages: cloned from the project's (instant on APFS; links stay
// inside the copy).
function packages() {
  const pairs = [["node_modules", "node_modules"]];
  for (const name of readdirSync(join(project, "packages")))
    pairs.push([
      join("packages", name, "node_modules"),
      join("packages", name, "node_modules"),
    ]);
  for (const [from, to] of pairs)
    if (existsSync(join(project, from)) && !existsSync(join(copy, to)))
      spawnSync("cp", ["-cR", join(project, from), join(copy, to)], {
        stdio: "inherit",
      });
}

function freePort() {
  return new Promise((done, fail) => {
    const server = createServer();
    server.on("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => done(port));
    });
  });
}

// A fresh demo project each start: the example shop with its personas,
// before launch (no signals yet).
function demo() {
  const folder = `${copy}-demo`;
  rmSync(folder, { recursive: true, force: true });
  cpSync(join(copy, "examples", "acme"), folder, { recursive: true });
  // Before launch: no signals yet, so the page starts empty.
  rmSync(join(folder, "factory", "kobble", "signals"), {
    recursive: true,
    force: true,
  });
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
  return folder;
}

async function answers(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

packages();
const folder = demo();
const api = await freePort();
const page = await freePort();
const children = [
  // Dev mode: the server starts again by itself when the kobold changes one
  // of its files, as the page reloads by itself through Vite.
  spawn(
    "node",
    [
      "--watch",
      "--watch-preserve-output",
      join(copy, "packages/server/bin/software-factory.ts"),
      folder,
      "--port",
      String(api),
      "--no-open",
    ],
    { stdio: "inherit" },
  ),
];
const config = join(folder, "vite.prototype.mjs");
writeFileSync(
  config,
  `import base from ${JSON.stringify(join(copy, "packages/dashboard/vite.config.ts"))};
export default { ...base, root: ${JSON.stringify(join(copy, "packages/dashboard"))},
  server: { ...base.server, port: ${page}, strictPort: true, proxy: { "/api": "http://127.0.0.1:${api}" } } };
`,
);
children.push(
  spawn(join(copy, "node_modules/.bin/vite"), ["--config", config], {
    cwd: join(copy, "packages/dashboard"),
    stdio: "inherit",
  }),
);
const stop = () => {
  for (const child of children) child.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
for (const child of children) child.on("exit", stop);
const url = `http://127.0.0.1:${page}/`;
const until = Date.now() + 120_000;
while (
  !(await answers(`http://127.0.0.1:${api}/api/kobble/signals`)) ||
  !(await answers(url))
) {
  if (Date.now() > until)
    throw new Error(`The prototype did not answer on ${url}.`);
  await new Promise((done) => setTimeout(done, 500));
}
console.log(`FACTORY_URL=${url}#signals`);
