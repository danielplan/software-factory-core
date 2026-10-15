#!/usr/bin/env node
// software-factory [folder] [--port <port>] [--no-open]
//
// Starts the factory on this computer and opens it in the browser: the
// factory in `folder`, or, where there is none yet, the setup page (a new
// factory then goes in `folder`, or in ~/Factories/<company>).

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { WarmClaude } from "@software-factory/core";
import { allKits } from "@software-factory/kits";
import { templateFolder } from "@software-factory/knowledge-base";
import { guidesFolder, templatesFolder } from "@software-factory/method";

import { startServer } from "../src/server.ts";
import { defaultFactoriesFolder, Session } from "../src/session.ts";
import { trackers } from "../src/trackers.ts";

// The command that opens an address in the default browser.
const OPENER: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "open",
  win32: "explorer",
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string", default: "4300" },
    "no-open": { type: "boolean", default: false },
  },
});
const port = Number(values.port);
const root = positionals[0] ? resolve(positionals[0]) : null;
const page = join(import.meta.dirname, "..", "..", "dashboard", "dist");

let changed = () => {};
// Claude Code on this computer, signed in with the owner's own account.
const claude = new WarmClaude(process.env.CLAUDE_PATH ?? "claude");
const session = new Session({
  root,
  factoriesFolder: defaultFactoriesFolder(homedir()),
  available: { extensions: [trackers], kits: allKits },
  templates: {
    knowledgeBase: templateFolder,
    agents: join(templatesFolder, "AGENTS.md"),
  },
  onChange: () => {
    changed();
  },
  coach: {
    claude,
    guide: readFileSync(join(guidesFolder, "setup-coach.md"), "utf8"),
  },
});
const started = startServer({ session, page, port });
changed = started.changed;

const address = `http://localhost:${String(port)}`;
console.log(`The software factory: ${address}`);
console.log(
  "Keep this window open. Closing it stops what the factory started.",
);
if (!values["no-open"]) openInBrowser(address);

for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    session.close();
    claude.stop();
    process.exit(0);
  });

function openInBrowser(url: string): void {
  const command = OPENER[process.platform] ?? "xdg-open";
  spawn(command, [url], { stdio: "ignore", detached: true }).unref();
}
