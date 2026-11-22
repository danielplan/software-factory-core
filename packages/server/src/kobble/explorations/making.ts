// Making one prototype: its copy of the code (it runs meanwhile, so the
// team watches it change), the maker asked with the explore skill, its own
// tool to look and a browser to click through it, in the conversation it
// keeps for that prototype; then started again so the newest runs, made to
// look once when it did not, and what it made committed, pushed and told
// (made.ts).

import { readFileSync, writeFileSync } from "node:fs";

import {
  type Board,
  type Claude,
  type Exploration,
  makerModel,
} from "@software-factory/core";

import { versionCopy, versionWorkspace } from "../../prototypes/copies.ts";
import type { PrototypeMode } from "../../prototypes/mode.ts";
import type { Browser } from "../persona-tests.ts";
import type { Photograph } from "../usage-pictures.ts";
import { lookAndFix, type Looks } from "./looks.ts";
import { finishMaking, type Ready } from "./made.ts";
import { askerFor, type MakerDesk } from "./maker-desk.ts";
import { askFor } from "./making-words.ts";
import { codeMaps } from "./product-picture.ts";
import type { Made } from "./versions.ts";

type MakeOn = {
  project: string;
  root: string;
  claude: Claude;
  browser?: () => Promise<Browser>;
  photograph?: Photograph;
  mode: PrototypeMode;
  desk: MakerDesk;
  ready: Ready;
  exploration: Exploration;
  board: Board;
  made: Made;
  change: string | undefined;
  mark: (now: { opens?: string; states?: string[] }) => void;
  look: () => Promise<Looks>;
};

// The maker's browser, open while it makes the prototype; without one (none
// could start) it still makes it, and only looks at pictures.
export async function makeOne(on: MakeOn): Promise<void> {
  const browser = on.browser ? await on.browser().catch(() => null) : null;
  try {
    await makeWith(on, browser);
  } finally {
    browser?.close();
  }
}

async function makeWith(on: MakeOn, browser: Browser | null): Promise<void> {
  const { mode, desk, exploration, made, change } = on;
  const { key } = made;
  const copy = versionCopy(on.project, exploration.id, key, made.branch);
  const workspace = await versionWorkspace(on.project, copy);
  // It runs while it is made: the team watches it change.
  mode.start(exploration.id, key).catch(() => undefined);
  // The conversation is saved beside the copy, so a maker after a restart
  // of the server continues it instead of starting over.
  const savedAt = `${copy.folder}.maker-session`;
  const ask = askerFor({
    claude: on.claude,
    folder: copy.folder,
    model: makerModel(on.root),
    session: desk.sessionFor(exploration.id, key, savedSession(savedAt)),
    mcp: desk.mcpFor(exploration.id, key),
    browser: browser
      ? { name: "browser", url: browser.url, headers: {} }
      : undefined,
    onStep: stepsInto(mode, exploration.id, key),
    onFresh: (session) => {
      desk.use(exploration.id, key, session);
    },
  });
  const asked = askFor(exploration, on.board, made, {
    change,
    maps: codeMaps(on.root, on.project),
  });
  let result: Awaited<ReturnType<typeof lookAndFix>>;
  try {
    const first = await ask(asked, false);
    // Started again, so what runs is the newest, server and all (a page
    // reloads by itself as files change, a server does not).
    await mode.stop(exploration.id, key);
    result = await lookAndFix(first, {
      ask: (prompt) => ask(prompt, true),
      look: on.look,
      looked: () => desk.hasLooked(exploration.id, key),
      opens: (page) => {
        on.mark({ opens: page });
      },
      states: (states) => {
        on.mark({ states });
      },
    });
  } finally {
    saveSession(savedAt, desk.done(exploration.id, key));
  }
  on.mark({});
  await finishMaking({
    mode,
    workspace,
    exploration: exploration.id,
    made,
    change,
    result,
    ready: on.ready,
    look: on.look,
  });
}

// Each step the maker takes, kept with the prototype's run (the last 60).
function stepsInto(mode: PrototypeMode, exploration: string, key: string) {
  return (line: string) => {
    const { steps } = mode.runOf(exploration, key);
    mode.set(exploration, key, {
      activity: line.slice(0, 80),
      steps: [...steps, line.slice(0, 200)].slice(-60),
    });
  };
}

function savedSession(file: string): string | null {
  try {
    const id = readFileSync(file, "utf8").trim();
    return /^[\w-]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function saveSession(file: string, session: string | null): void {
  if (!session) return;
  try {
    writeFileSync(file, session);
  } catch {
    // Not saved: the next maker after a restart starts a new conversation.
  }
}
