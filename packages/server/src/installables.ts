// What the setup coach may propose to install: the add-ons the core knows
// (extensions a company chooses) and the tools on this computer the factory
// works with. A closed list: the coach only proposes, the owner approves on
// the canvas, and making the factory installs only what is written here.

import { spawnSync } from "node:child_process";

import type { Extension } from "@software-factory/core";

export type Installable = {
  id: string;
  name: string;
  about: string;
  kind: "add-on" | "tool";
  // Whether this computer has it already (an add-on: never, it is chosen
  // for the new factory).
  present: () => boolean;
  // The commands that install a tool here, one after the other; null when
  // the owner installs it themselves, as `how` says.
  steps: string[][] | null;
  how: string;
};

// A tool on this computer: its command, and how to install it on each
// system that has a package manager the factory can use.
type ToolSpec = {
  id: string;
  name: string;
  about: string;
  command: string;
  how: string;
  install: Partial<Record<NodeJS.Platform, string[][]>>;
};

const WINGET = [
  "--exact",
  "--accept-package-agreements",
  "--accept-source-agreements",
];

const TOOLS: ToolSpec[] = [
  {
    id: "git",
    name: "Git",
    about: "Keeps the history of the code, and every change the factory makes.",
    command: "git",
    how: "Install it from git-scm.com.",
    install: {
      darwin: [["brew", "install", "git"]],
      win32: [["winget", "install", "--id", "Git.Git", ...WINGET]],
    },
  },
  {
    id: "gh",
    name: "GitHub CLI",
    about:
      "Lets the factory work with a GitHub board: issues, branches and pull requests.",
    command: "gh",
    how: "Install it from cli.github.com, then run gh auth login once.",
    install: {
      darwin: [["brew", "install", "gh"]],
      win32: [["winget", "install", "--id", "GitHub.cli", ...WINGET]],
    },
  },
];

// Whether a command answers on this computer.
function answers(command: string): boolean {
  const run = spawnSync(command, ["--version"], {
    stdio: "ignore",
    timeout: 5000,
    shell: process.platform === "win32",
  });
  return run.status === 0;
}

// The tools this computer can be given, on its system.
export function computerTools(
  platform: NodeJS.Platform = process.platform,
): Installable[] {
  return TOOLS.map((tool) => ({
    id: tool.id,
    name: tool.name,
    about: tool.about,
    kind: "tool",
    present: () => answers(tool.command),
    steps: tool.install[platform] ?? null,
    how: tool.how,
  }));
}

// The add-ons a company may choose: the extensions that are not on anyway.
export function addOns(extensions: Extension[]): Installable[] {
  return extensions
    .filter((extension) => !extension.core)
    .map((extension) => ({
      id: extension.id,
      name: extension.name,
      about: extension.about,
      kind: "add-on",
      present: () => false,
      steps: null,
      how: "It is switched on in the new factory.",
    }));
}
