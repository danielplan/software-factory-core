// An extension's server part: one shape for every extension, Kobble's own
// (Factory, Explorations, Signals, Personas, Releases) and the add-ons
// (GitHub, Jira) alike. Its folder's index.ts exports its declaration (what
// the core loads: what it brings and needs, the slots it uses or fills, its
// settings and guides) and serve(host), what it plugs in: its routes, the
// plugs it offers, its Sprocket plug, its kobolds' tools and its background
// work. The app (app/) answers and runs all of it only while the extension
// is installed. Extensions never call each other: they meet at the plugs
// (plugs/index.ts) and the slots, through the host the app gives each.

import type { IncomingMessage, ServerResponse } from "node:http";

import type {
  Available,
  Changes,
  Claude,
  Extension,
  KobbleStore,
} from "@software-factory/core";

import type { Cards } from "../cards/cards.ts";
import type { TaskBoards, TasksOf } from "../cards/cards-for.ts";
import type { CodeHostOf, CodeHosts } from "../code-host.ts";
import type { Board } from "../connect/board-file.ts";
import type { Cli } from "../github-cli.ts";
import type { Route } from "../http.ts";
import type { App, Browser } from "../kobble/browser.ts";
import type { SupportPlug } from "../kobble/support-plug.ts";
import type { Offers, PlugBoard } from "./index.ts";

export type ExtensionModule = {
  extension: Extension;
  // Where branches and pull requests go, when it fills the `code` slot.
  codeHost?: CodeHostOf;
  // A connected board's cards, when it fills the `tasks` slot.
  tasks?: TasksOf;
  // What it plugs in: served once the server starts, answered and run only
  // while it is installed.
  serve?: (host: Host) => Served;
};

export type Served = {
  // Its routes, by "METHOD /path"; a POST only from the factory's page.
  routes?: Record<string, Route>;
  // Requests it answers itself, before the routes: its kobolds' tools (each
  // checks its own token), the prototypes' world, a webhook.
  answers?: Answer[];
  // The plugs it offers other extensions and the core.
  offers?: Offers;
  // Its plug into Sprocket, made again each time (what is installed can
  // change).
  support?: () => SupportPlug;
  // The server listens at this address (…/api): its kobolds' tools and the
  // webhooks it is sent are there.
  listen?: (base: string) => void;
  // Its background work: started once it is installed and the server
  // listens, stopped when it is removed or the server stops.
  start?: () => void;
  stop?: () => void;
};

// A request an extension answers itself.
export type Answer = {
  matches: (incoming: IncomingMessage, url: URL) => boolean;
  answer: (
    incoming: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ) => Promise<void>;
};

// The core's side of the plug board, as one extension sees it.
export type Host = {
  // The project, and its factory's folder in it.
  project: string;
  factory: string;
  // Claude Code on this computer, for its kobolds.
  claude: Claude;
  // The GitHub CLI on this computer.
  cli: Cli;
  // Kobble's records: refused before there is a factory (store), or none
  // (records). Each collection is one extension's own; the others reach it
  // through its plug.
  store: () => KobbleStore;
  records: () => KobbleStore | null;
  // Tells the page what of Kobble changed ("signals", "explorations" …).
  changed: (what: string) => void;
  // Tells the page its whole state changed.
  stateChanged: () => void;
  // Whether an extension is installed now.
  isOn: (id: string) => boolean;
  // Another extension's plug, or null while it is not installed.
  plug: PlugBoard;
  // The slots' fillers, by the extension that fills each: where the code
  // lives (code) and where work is tracked (tasks).
  slots: { code: CodeHosts; tasks: TaskBoards };
  // The connected board's cards; refused with how to connect one.
  cards: () => Cards;
  // What a kobold that looks at an app works with: the apps it can be sent
  // into, an app's address as it is now (the first app's without a
  // product), and a browser.
  apps: () => App[];
  app: (product: string | null) => Promise<string>;
  browser: () => Promise<Browser>;
  // The builder's browser, when it has one.
  builderBrowser?: () => Promise<Browser>;
  // The extensions and kits Kobble ships with.
  available: Available;
  // The factory opening (again, when its files change) and closing; the
  // watcher hears the factory open now at once. Answers how to stop.
  watch: (watcher: {
    opened: (root: string) => void;
    closed: () => void;
  }) => () => void;
  // Work is tracked with this extension from now on: its entry in the
  // factory's board.json, and its secrets in its settings group (the one
  // with its id).
  connect: (entry: Board[string], secrets?: Changes) => void;
  // A tool on this computer, installed with the system's package manager.
  installTool: (id: string) => Promise<{ installed: boolean }>;
};

// An add-on's routes, by "METHOD /path", at /api/add-ons/<id>/path.
export function addOnRoutes(
  id: string,
  routes: Record<string, Route>,
): Record<string, Route> {
  return Object.fromEntries(
    Object.entries(routes).map(([key, route]): [string, Route] => {
      const [method, path] = key.split(" ", 2) as [string, string];
      return [`${method} /api/add-ons/${id}${path}`, route];
    }),
  );
}

// The slots' fillers among these modules, by the extension that fills each:
// where the code lives (code) and where work is tracked (tasks).
export function slotFillers(modules: ExtensionModule[]): {
  code: CodeHosts;
  tasks: TaskBoards;
} {
  const by = <T>(pick: (module: ExtensionModule) => T | undefined) =>
    Object.fromEntries(
      modules.flatMap((module) => {
        const filler = pick(module);
        return filler ? [[module.extension.id, filler]] : [];
      }),
    ) as Readonly<Record<string, T>>;
  return { code: by((m) => m.codeHost), tasks: by((m) => m.tasks) };
}
