// Runs a command-line tool (git, gh) and returns what it printed.

import { spawn } from "node:child_process";

export async function run(
  command: string,
  args: string[],
  options: { cwd?: string; input?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      env: options.env ? { ...process.env, ...options.env } : process.env,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else
        reject(
          new Error(
            `${command} ${args.slice(0, 3).join(" ")} failed: ${(err || out).trim()}`,
          ),
        );
    });
    child.stdin.end(options.input ?? "");
  });
}
