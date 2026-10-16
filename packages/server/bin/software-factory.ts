#!/usr/bin/env node
// software-factory [folder] [--port <port>] [--no-open]
// software-factory new <name>
//
// Run in a project, starts its factory on this computer and opens it in the
// browser. The factory lives in the project, in its factory/ folder, found
// from anywhere inside it. Where there is none yet, the browser sets one up
// with the owner: the coach reads the project's code (the top of its git
// repository, or the folder) and drafts the factory on a canvas. `new`
// makes a folder for a new idea and sets it up there.

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { findFactory, projectOf, WarmClaude } from "@software-factory/core";
import { allKits } from "@software-factory/kits";
import { templateFolder } from "@software-factory/knowledge-base";
import { guidesFolder, templatesFolder } from "@software-factory/method";

import { computerTools } from "../src/installables.ts";
import { startServer } from "../src/server.ts";
import { Session } from "../src/session.ts";
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
const project = projectFrom(positionals);
const page = join(import.meta.dirname, "..", "..", "dashboard", "dist");

let changed = () => {};
// Claude Code on this computer, signed in with the owner's own account.
const claude = new WarmClaude(process.env.CLAUDE_PATH ?? "claude");
const session = new Session({
  project,
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
    ideaGuide: readFileSync(join(guidesFolder, "idea-coach.md"), "utf8"),
  },
  tools: computerTools(),
});
const started = startServer({ session, page, port });
changed = started.changed;

const address = `http://localhost:${String(port)}`;
console.log(`The software factory for ${project}: ${address}`);
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

// The project to open: a new folder for `new <name>`; otherwise the one
// whose factory is found from the folder given (or this one), or, with
// none, the project around it.
function projectFrom([first, name]: string[]): string {
  if (first === "new") {
    if (!name) {
      console.error("Name the new project: software-factory new <name>");
      process.exit(1);
    }
    const folder = resolve(name);
    mkdirSync(folder, { recursive: true });
    return folder;
  }
  const start = resolve(first ?? ".");
  const factory = findFactory(start);
  return factory ? dirname(factory) : projectOf(start);
}

function openInBrowser(url: string): void {
  const command = OPENER[process.platform] ?? "xdg-open";
  spawn(command, [url], { stdio: "ignore", detached: true }).unref();
}
