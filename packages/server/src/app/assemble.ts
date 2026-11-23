// The assembly: the core's own routes and background work (Sprocket, the
// feedback board, updates, what the team arranges in the factory's files),
// and every extension module served with its host. An extension's routes
// and its own answers are answered only while it is installed, its
// background work runs only then, and its plugs reach the others (and the
// core) only then. What persona tests and the other kobolds that look at
// an app run on is the product as the launcher starts it, and Playwright's
// browser, unless the tests give stand-ins.

import type { Cli } from "../github-cli.ts";
import { guidesFor } from "../extension-guides.ts";
import { homeLayoutRoutes } from "../home-layout.ts";
import type { Route } from "../http.ts";
import type { App, Browser } from "../kobble/browser.ts";
import { SupportTalk, supportRoutes } from "../kobble/support.ts";
import type { SupportTools } from "../kobble/support-tools.ts";
import { type ExtensionModule, slotFillers } from "../plugs/extension.ts";
import type { Session } from "../session.ts";
import { coreOf } from "./core-routes.ts";
import { hostOf } from "./host.ts";
import { servePlugged } from "./plug-board.ts";

// What a kobold that looks at an app runs on: the apps it can be sent
// into, an app's address as it is now (the first app's without a
// product), and a browser.
export type TestsRunOn = {
  apps: () => App[];
  app: (product: string | null) => Promise<string>;
  browser: () => Promise<Browser>;
};

type Options = {
  // The extension modules Kobble ships with (stand-ins in the tests).
  modules: ExtensionModule[];
  cli: Cli;
  testsRunOn?: TestsRunOn;
  // Starts the factory again on a new Kobble, with the parts that ran.
  restartFactory?: (resume: string[]) => Promise<void>;
};

// Tells the page what of Kobble changed ("signals", "explorations" …).
function tellerOf(tell: (event: string) => void) {
  return (what: string) => {
    tell(`event: kobble-changed\ndata: ${JSON.stringify({ what })}\n\n`);
  };
}

export function assemble(
  session: Session,
  tell: (event: string) => void,
  // The page's whole state changed.
  stateChanged: () => void,
  options: Options,
) {
  const { project } = session.options;
  const changed = tellerOf(tell);
  const isOn = (id: string) => session.isOn(id);
  const slots = slotFillers(options.modules);
  const host = hostOf(session, {
    cli: options.cli,
    changed,
    stateChanged,
    slots,
    ...(options.testsRunOn ? { testsRunOn: options.testsRunOn } : {}),
  });
  const board = servePlugged(options.modules, host, isOn);
  session.plugged.plugInto(board.plug);
  const core = coreOf(session, changed, {
    cli: options.cli,
    slots,
    plug: board.plug,
    ...(options.restartFactory
      ? { restartFactory: options.restartFactory }
      : {}),
  });
  const support = new SupportTalk({
    claude: session.options.coach.claude,
    project,
    onChange: () => {
      changed("support");
    },
    plugs: board.support,
    guides: () => guidesFor(project, session.options.available, "support"),
  });
  return {
    routes: {
      ...core.routes,
      ...supportRoutes(support),
      ...homeRoutes(project, session, changed, board.home),
      ...board.routes(),
    },
    answers: board.answers,
    supportTools: (): SupportTools => support.tools(),
    // Where the server answers the kobolds' tools and the webhooks.
    listen: (base: string) => {
      board.listen(base);
      support.serveToolsAt(`${base}/kobble/support/mcp`);
    },
    reconcile: board.reconcile,
    start: () => {
      board.reconcile();
      core.start();
    },
    close: () => {
      board.close();
      core.close();
    },
  };
}

// Home: how the team arranged it, and the data of the blocks the installed
// extensions bring.
function homeRoutes(
  project: string,
  session: Session,
  changed: (what: string) => void,
  blocks: () => Record<string, unknown>,
): Record<string, Route> {
  const factory = () => {
    const state = session.state();
    return state.mode === "factory" ? state : null;
  };
  return {
    ...homeLayoutRoutes(project, changed, () =>
      (factory()?.addOns ?? []).flatMap((one) => one.brings.blocks),
    ),
    "GET /api/home": () => ({ blocks: blocks() }),
  };
}
