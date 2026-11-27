// What the browser reported as errors while a persona used the app: the
// lines its console wrote as [ERROR], from the log files Playwright's MCP
// server keeps in the test's folder. Each read gives only what is new since
// the last one, each text once.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// "[   19478ms] [ERROR] Failed to load resource: … @ http://…": the text
// after [ERROR], without the time.
const ERROR_MARK = "[ERROR]";
const MOST = 20;

export class BrowserConsole {
  private readonly folder: string;
  private readonly read = new Set<string>();
  private readonly said = new Set<string>();

  constructor(folder: string) {
    this.folder = folder;
  }

  // The errors in the log files not read before, at most MOST of them.
  errors(): string[] {
    if (!existsSync(this.folder)) return [];
    const files = readdirSync(this.folder)
      .filter((name) => /^console-.*\.log$/.test(name) && !this.read.has(name))
      .sort((a, b) => a.localeCompare(b));
    const found: string[] = [];
    for (const name of files) {
      this.read.add(name);
      for (const line of readFileSync(join(this.folder, name), "utf8").split(
        "\n",
      )) {
        const at = line.indexOf(ERROR_MARK);
        const text = at === -1 ? "" : line.slice(at + ERROR_MARK.length).trim();
        if (!text || this.said.has(text) || this.said.size >= MOST) continue;
        this.said.add(text);
        found.push(text);
      }
    }
    return found;
  }
}
