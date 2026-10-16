// A factory server for the tests, on a free port, with a stand-in kit for
// web apps, a stand-in add-on, stand-in tools to install and, for the setup
// coach, a pretend Claude Code.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type Claude,
  defineExtension,
  defineKit,
} from "@software-factory/core";
import { templateFolder } from "@software-factory/knowledge-base";
import { templatesFolder } from "@software-factory/method";

import type { Installable } from "../src/installables.ts";
import { PAGE_HEADER, startServer } from "../src/server.ts";
import { Session } from "../src/session.ts";
import { trackers } from "../src/trackers.ts";

export const web = defineKit({
  id: "web-kit",
  name: "Web kit",
  about: "A stand-in for web apps.",
  kind: "web-app",
  commands: { start: "npm run dev" },
  port: 5173,
  detect: (folder) =>
    existsSync(join(folder, "web.txt"))
      ? { name: "Found app", commands: { verify: "npm test" } }
      : null,
  // Makes the folder with a file in it, as a real starter would.
  create: (folder) => [
    [
      process.execPath,
      "-e",
      `require("fs").mkdirSync(${JSON.stringify(folder)}, { recursive: true })`,
    ],
  ],
});

const voice = defineExtension({
  id: "voice",
  name: "Voice",
  about: "Talk with the coach out loud.",
});

// A tool to install: one that installs (a command that works), one that is
// here already, and one the factory cannot install here.
const tool = (id: string, more: Partial<Installable>): Installable => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
  about: `The ${id}.`,
  kind: "tool",
  present: () => false,
  steps: [[process.execPath, "-e", ""]],
  how: `Get the ${id} from the shop.`,
  ...more,
});
export const tools = [
  tool("hammer", {}),
  tool("saw", { present: () => true }),
  tool("drill", { steps: null }),
];

export async function stage(
  claude: Claude = { run: () => Promise.resolve({ ok: true, text: "" }) },
  // The project's code before the factory starts; none by default.
  code: Record<string, string> = {},
) {
  const home = mkdtempSync(join(tmpdir(), "setup-"));
  const project = join(home, "project");
  mkdirSync(project);
  for (const [file, text] of Object.entries(code))
    writeFileSync(join(project, file), text);
  const session = new Session({
    project,
    available: { extensions: [trackers, voice], kits: [web] },
    templates: {
      knowledgeBase: templateFolder,
      agents: join(templatesFolder, "AGENTS.md"),
    },
    onChange: () => {},
    coach: { claude, guide: "Help set up." },
    tools,
  });
  const page = join(home, "page");
  mkdirSync(page);
  writeFileSync(join(page, "index.html"), "<p>The factory</p>");
  // Port 0: the system picks a free one.
  const { server } = startServer({ session, page, port: 0 });
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://localhost:${String(address.port)}`;
  const post = async (path: string, body: unknown, header = true) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: header ? { [PAGE_HEADER]: "1" } : {},
      body: JSON.stringify(body),
    });
  return { home, project, session, server, base, post };
}
