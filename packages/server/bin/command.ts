// The software-factory command itself (see software-factory.ts, which
// starts it): the commands that answer and end, or the project's factory
// on this computer.

import { playwrightBrowser } from "../src/kobble/browser.ts";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { findFactory, projectOf, WarmClaude } from "@software-factory/core";
import { allKits } from "@software-factory/kits";
import { templateFolder } from "@software-factory/knowledge-base";
import { guidesFolder, templatesFolder } from "@software-factory/skills";

import { cardCommand } from "../src/cards/command.ts";
import { prototypeCommand } from "../src/prototypes/command.ts";
import { topCommand } from "../src/top-commands.ts";
import { computerTools } from "../src/installables.ts";
import { upgradeCommand } from "../src/upgrade/command.ts";
import { startServer } from "../src/app/server.ts";
import { Session } from "../src/session.ts";
import { githubSetup } from "../src/extensions/github/board-setup.ts";
import { codeHostsOf } from "../src/plugs/extension.ts";
import { githubAddOn } from "../src/extensions/github/index.ts";
import { jiraAddOn } from "../src/extensions/jira/index.ts";
import { KOBBLE_EXTENSIONS } from "../src/app/modules.ts";

// The parts that ran before the factory started again on a new Kobble.
const RESUME = "SOFTWARE_FACTORY_RESUME";

// The command that opens an address in the default browser.
const OPENER: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "open",
  win32: "explorer",
};

// The board's cards, for the coding agents: answered here, then done.
if (process.argv[2] === "card")
  process.exit(await cardCommand(process.argv.slice(3)));

// A card's prototype, in its own copy of the code: answered here, then done.
if (process.argv[2] === "prototype")
  process.exit(await prototypeCommand(process.argv.slice(3)));

// Help, the knowledge base's checks, and words that are no command: answered
// here, then done (never taken for a folder to start the factory in).
const answered = await topCommand(process.argv.slice(2));
if (answered !== null) process.exit(answered);

// The add-ons that ship with the factory.
const addOns = [githubAddOn(), jiraAddOn()];
const extensions = [
  ...KOBBLE_EXTENSIONS,
  ...addOns.map((addOn) => addOn.extension),
];

// The project's factory, brought to this core's version: done, then exit.
if (process.argv[2] === "upgrade")
  process.exit(
    await upgradeCommand(process.cwd(), {
      kits: allKits,
      extensions,
    }),
  );

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
  codeHosts: codeHostsOf(addOns),
  available: {
    extensions,
    kits: allKits,
  },
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
    trackers: [githubSetup()],
    builderBrowser: playwrightBrowser,
  },
  tools: computerTools(),
});
const started = startServer({ session, page, port, addOns, restartFactory });
changed = started.changed;
resumeParts(process.env[RESUME]);

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

// The factory starting again on the Kobble an update installed, in this
// same window: this one lets go of its port and its products, the new one
// starts them again, and this one waits for it and ends with it.
function restartFactory(resume: string[]): Promise<void> {
  session.close();
  started.server.closeAllConnections();
  started.server.close(() => {
    const again = spawn(
      process.execPath,
      [
        ...process.execArgv,
        ...process.argv.slice(1).filter((arg) => arg !== "--no-open"),
        "--no-open",
      ],
      { stdio: "inherit", env: { ...process.env, [RESUME]: resume.join(",") } },
    );
    again.on("exit", (code) => process.exit(code ?? 0));
  });
  return Promise.resolve();
}

// Starts the parts that ran before, once the factory is open.
function resumeParts(list: string | undefined, tries = 30): void {
  const ids = (list ?? "").split(",").filter(Boolean);
  if (ids.length === 0) return;
  try {
    const launcher = session.launcherOrRefuse();
    for (const id of ids) void launcher.start(id).catch(() => {});
  } catch {
    if (tries > 0)
      setTimeout(() => {
        resumeParts(list, tries - 1);
      }, 1000);
  }
}

function openInBrowser(url: string): void {
  const command = OPENER[process.platform] ?? "xdg-open";
  spawn(command, [url], { stdio: "ignore", detached: true }).unref();
}
