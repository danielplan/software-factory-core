// Making one prototype: its copy of the code (it runs meanwhile, so the
// team watches it change), the maker asked with the explore skill and its own
// tool to look, then started again so the newest runs, made to look once
// when it did not, and what it made committed, pushed and told (made.ts).

import type { Board, Claude, Exploration } from "@software-factory/core";

import { versionCopy, versionWorkspace } from "../../prototypes/copies.ts";
import type { PrototypeMode } from "../../prototypes/mode.ts";
import type { Photograph } from "../usage-pictures.ts";
import { lookAndFix, type Looks } from "./looks.ts";
import { finishMaking, type Ready } from "./made.ts";
import { askerFor, type MakerDesk } from "./maker-desk.ts";
import { askFor } from "./making-words.ts";
import { codeMaps } from "./product-picture.ts";
import type { Made } from "./versions.ts";

export async function makeOne(on: {
  project: string;
  root: string;
  claude: Claude;
  photograph?: Photograph;
  mode: PrototypeMode;
  desk: MakerDesk;
  ready: Ready;
  exploration: Exploration;
  board: Board;
  made: Made;
  change: string | undefined;
  mark: (now: { opens?: string }) => void;
  look: () => Promise<Looks>;
}): Promise<void> {
  const { mode, desk, exploration, made, change } = on;
  const { key } = made;
  const copy = versionCopy(on.project, exploration.id, key, made.branch);
  const workspace = await versionWorkspace(on.project, copy);
  // It runs while it is made: the team watches it change.
  mode.start(exploration.id, key).catch(() => undefined);
  const ask = askerFor({
    claude: on.claude,
    folder: copy.folder,
    mcp: desk.mcpFor(exploration.id, key),
    onStep: (line) => {
      const { steps } = mode.runOf(exploration.id, key);
      mode.set(exploration.id, key, {
        activity: line.slice(0, 80),
        steps: [...steps, line.slice(0, 200)].slice(-60),
      });
    },
  });
  const asked = askFor(exploration, on.board, made, {
    change,
    maps: codeMaps(on.root),
  });
  const first = await ask(asked, false);
  // Started again, so what runs is the newest, server and all (a page
  // reloads by itself as files change, a server does not).
  await mode.stop(exploration.id, key);
  const result = await lookAndFix(first, {
    ask: (prompt) => ask(prompt, true),
    look: on.look,
    looked: () => desk.hasLooked(exploration.id, key),
    opens: (page) => {
      on.mark({ opens: page });
    },
  });
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
