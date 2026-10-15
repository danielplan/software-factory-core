// Starts programs, keeps their last lines of output, and stops them together
// with everything they started, so nothing is left running in the background.

import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { stripVTControlCharacters } from "node:util";

const LOG_LINES = 40;

// "node" and "npm" run through this computer's Node directly, which avoids the
// npm vs npm.cmd trap in PowerShell and works the same on every system.
export function resolveCommand(command: string[]): {
  file: string;
  args: string[];
} {
  const [first, ...rest] = command;
  if (first === "node") return { file: process.execPath, args: rest };
  if (first === "npm") {
    const cli = join(
      dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    );
    if (existsSync(cli))
      return { file: process.execPath, args: [cli, ...rest] };
  }
  if (first === undefined) throw new Error("A command needs a program to run.");
  return { file: first, args: rest };
}

export class Program {
  readonly log: string[] = [];
  exitCode: number | null = null;
  private child: ChildProcess;
  private exited: Promise<void>;

  constructor(
    command: string[],
    options: { cwd: string; env?: Record<string, string> },
  ) {
    const { file, args } = resolveCommand(command);
    this.child = spawn(file, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env, FORCE_COLOR: "0" },
      windowsHide: true,
      // Its own process group elsewhere, so the whole group can be stopped.
      detached: process.platform !== "win32",
    });
    this.exited = new Promise((resolve) => {
      this.child.once("close", (code) => {
        this.exitCode = code ?? 1;
        resolve();
      });
      this.child.once("error", (error) => {
        this.remember(error.message);
        this.exitCode = 1;
        resolve();
      });
    });
    this.child.stdout?.on("data", (chunk: Buffer) => {
      this.remember(chunk);
    });
    this.child.stderr?.on("data", (chunk: Buffer) => {
      this.remember(chunk);
    });
  }

  get running(): boolean {
    return this.exitCode === null;
  }

  async finished(): Promise<number> {
    await this.exited;
    return this.exitCode ?? 1;
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    stopTree(this.child.pid);
    await Promise.race([
      this.exited,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }

  // Used on exit, when there is no time to wait.
  stopNow(): void {
    if (this.running) stopTree(this.child.pid);
  }

  private remember(chunk: Buffer | string): void {
    // Colour and cursor codes from tools that ignore FORCE_COLOR are removed.
    const text = stripVTControlCharacters(chunk.toString());
    for (const line of text.split(/\r?\n/))
      if (line.trim() !== "") this.log.push(line);
    if (this.log.length > LOG_LINES)
      this.log.splice(0, this.log.length - LOG_LINES);
  }
}

// Windows' own taskkill by its full path, so no program of the same name
// earlier in PATH runs instead.
const TASKKILL = join(
  process.env.SystemRoot ?? "C:\\Windows",
  "System32",
  "taskkill.exe",
);

function stopTree(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync(TASKKILL, ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    // Already stopped.
  }
}
