// Desktop start: a file on the owner's desktop that opens the factory with
// a double-click, for owners who do not use a terminal. On Windows a .cmd
// file, on macOS a .command file, elsewhere a shell script; it goes to the
// project's folder and starts the factory there (its window stays open
// while the factory runs; closing it stops the factory).

import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The factory's own command, as this server was started.
const BIN = fileURLToPath(
  new URL("../bin/software-factory.ts", import.meta.url),
);

export type DesktopOptions = {
  project: string;
  // The company's name, for the file's name.
  name: string;
  platform?: NodeJS.Platform;
  home?: string;
  bin?: string;
};

// Writes the start file on the desktop; where it is.
export function putStartOnDesktop(options: DesktopOptions): string {
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();
  const desktop = join(home, "Desktop");
  if (!existsSync(desktop)) mkdirSync(desktop, { recursive: true });
  const title = `${plainName(options.name)} factory`;
  const bin = options.bin ?? BIN;
  if (platform === "win32") {
    const file = join(desktop, `${title}.cmd`);
    writeFileSync(file, windowsStart(title, options.project, bin));
    return file;
  }
  const file = join(
    desktop,
    `${title}${platform === "darwin" ? ".command" : ".sh"}`,
  );
  writeFileSync(file, shellStart(title, options.project, bin));
  chmodSync(file, 0o755);
  return file;
}

function plainName(name: string): string {
  return name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "The";
}

function windowsStart(title: string, project: string, bin: string): string {
  return [
    "@echo off",
    `title ${title}`,
    `cd /d "${project}"`,
    "where node >nul 2>nul",
    "if errorlevel 1 (",
    "  echo Node.js is not installed. Install it from https://nodejs.org and try again.",
    "  pause",
    "  exit /b 1",
    ")",
    "echo Starting the factory. Keep this window open: closing it stops the factory.",
    `node "${bin}"`,
    "if errorlevel 1 pause",
    "",
  ].join("\r\n");
}

function shellStart(title: string, project: string, bin: string): string {
  return [
    "#!/bin/sh",
    `# ${title}: starts the factory. Closing this window stops it.`,
    `cd "${project}" || exit 1`,
    "if ! command -v node >/dev/null 2>&1; then",
    '  echo "Node.js is not installed. Install it from https://nodejs.org and try again."',
    "  read -r _",
    "  exit 1",
    "fi",
    'echo "Starting the factory. Keep this window open: closing it stops the factory."',
    `node "${bin}"`,
    "",
  ].join("\n");
}
