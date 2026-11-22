// The factory's local web server: the web interface's files, the state it
// shows (once, and as a stream of changes), and its buttons. It answers only
// requests addressed to this computer by name, and buttons only from its own
// page (which sends PAGE_HEADER), so another web page cannot press them.

import { existsSync, readFileSync, statSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { extname, join, normalize, sep } from "node:path";

import { PICTURE_TYPES } from "../coach/pictures.ts";
import { sendTheme, THEME_ROUTES } from "../theme.ts";
import { type AddOn, addOnRoutes, type Route } from "../plugs/extension.ts";
import { answerAgentTools, isAgentTools } from "../agent-tools.ts";
import type { SupportTools } from "../kobble/support-tools.ts";
import { type Cli, realCli } from "../extensions/github/github.ts";
import { WEBHOOK_PATH } from "../extensions/factory/builder/signals.ts";
import { readBody, send } from "../http.ts";
import { on, optionalText, record } from "../asked.ts";
import type { MakerTools } from "../extensions/explorations/maker-tools.ts";
import type { BoardTools } from "../extensions/explorations/board-tools.ts";
import { kobbleOf, type TestsRunOn } from "./assemble.ts";
import {
  answerWorld,
  isWorldRoute,
} from "../extensions/explorations/world-route.ts";
import type { ExplorationWorlds } from "../extensions/explorations/worlds.ts";
import { Refused } from "../refused.ts";
import type { Session } from "../session.ts";

export const PAGE_HEADER = "x-software-factory";
// A picture from the project that a setup card shows.
const PICTURE = "/api/setup/picture";
const HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

export function startServer(options: {
  session: Session;
  // The add-ons whose routes it answers (stand-ins in the tests).
  addOns: AddOn[];
  // The built web interface (index.html and its files).
  page: string;
  port: number;
  // The GitHub CLI (a stand-in in the tests).
  cli?: Cli;
  // What persona tests run on (stand-ins in the tests).
  testsRunOn?: TestsRunOn;
  // Starts the factory again on a new Kobble, with the parts that ran; the
  // command line gives it, the tests do not.
  restartFactory?: (resume: string[]) => Promise<void>;
}): { server: Server; changed: () => void } {
  const watchers = new Set<ServerResponse>();
  const tell = (event: string) => {
    for (const response of watchers) response.write(event);
  };
  // The whole state, as the page shows it.
  const changed = () => {
    tell(`data: ${JSON.stringify(options.session.state())}\n\n`);
  };
  const { session } = options;
  const cli = options.cli ?? realCli();
  const kobble = kobbleOf(session, tell, { ...options, cli });
  const routes = {
    ...routesFor(session),
    ...kobble.routes,
    ...addOnRoutes(
      options.addOns,
      (id) => ({
        connect: (entry, secrets) => {
          session.chooseBoard(id, entry, secrets);
        },
        installTool: (tool) => session.installTool(tool),
        changed,
      }),
      (id) => session.isOn(id),
    ),
  };
  const server = createServer((incoming, response) => {
    void answer(incoming, response, {
      // Kobble's agents' tools and worlds; the routes are all of them.
      ...kobble,
      routes,
      watchers,
      ...options,
    });
  });
  server.on("listening", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    options.session.serveToolsAt(`http://localhost:${String(port)}/api`);
    options.session.work.listenAt(`http://localhost:${String(port)}/api`);
    options.session.begin();
    kobble.serveToolsAt(`http://localhost:${String(port)}/api`);
    kobble.start();
  });
  server.on("close", kobble.close);
  server.listen(options.port, "127.0.0.1");
  return { server, changed };
}

function routesFor(session: Session): Record<string, Route> {
  const launcher = () => session.launcherOrRefuse();
  const part = (url: URL) =>
    decodeURIComponent(url.pathname.split("/")[3] ?? "");
  return {
    "GET /api/state": () => session.state(),
    "POST /api/setup/say": (body) =>
      session.coach.say(text(body, "text"), optionalText(body, "spokenIn")),
    "POST /api/setup/draft": (body) => {
      session.ownerChangesDraft(
        body as Parameters<Session["ownerChangesDraft"]>[0],
      );
    },
    "POST /api/setup/build": () => session.build(),
    "POST /api/ideas": (body) => ({
      id: session.ideasOrRefuse().create(text(body, "text")),
    }),
    "POST /api/ideas/say": (body) =>
      session
        .ideasOrRefuse()
        .say(
          text(body, "id"),
          text(body, "text"),
          optionalText(body, "spokenIn"),
        ),
    "POST /api/ideas/draft": (body) => {
      session
        .ideasOrRefuse()
        .ownerChange(
          text(body, "id"),
          body as Parameters<Session["ownerChangesDraft"]>[0],
        );
    },
    "POST /api/ideas/ready": (body) => {
      session.ideasOrRefuse().ready(text(body, "id"));
    },
    "POST /api/ideas/discard": (body) => {
      session.ideasOrRefuse().discard(text(body, "id"));
    },
    "POST /api/setup/open": () => {
      session.openFactory();
    },
    "POST /api/add-ons": (body) => {
      session.switchAddOn(text(body, "id"), on(body));
    },
    ...workRoutes(session),
    "POST /api/settings": (body) =>
      session.saveSettings(text(body, "group"), record(body, "values")),
    "POST /api/parts/start": (_b, url) => launcher().start(part(url)),
    "POST /api/parts/stop": (_b, url) => launcher().stop(part(url)),
    "POST /api/parts/restart": (_b, url) => launcher().restart(part(url)),
    "POST /api/start-all": () => launcher().startAll(),
    "POST /api/stop-all": () => launcher().stopAll(),
  };
}

type Context = {
  routes: Record<string, Route>;
  watchers: Set<ServerResponse>;
  worlds: ExplorationWorlds;
} & AgentTools;

type AgentTools = {
  boardTools: (id: string) => BoardTools;
  makerTools: (id: string, key: string) => MakerTools;
  supportTools: () => SupportTools;
  page: string;
  session: Session;
};

async function answer(
  incoming: IncomingMessage,
  response: ServerResponse,
  context: Context,
): Promise<void> {
  const host = (incoming.headers.host ?? "").replace(/:\d+$/, "");
  const url = new URL(incoming.url ?? "/", "http://localhost");
  if (!HOSTS.has(host)) {
    send(response, 403, { error: "Not here." });
  } else if (url.pathname === "/api/events") {
    stream(response, context);
  } else if (isWorldRoute(url)) {
    await answerWorld(incoming, response, url, context.worlds);
  } else if (isAgentTools(incoming, url)) {
    await answerAgentTools(incoming, response, url, context);
  } else if (url.pathname === WEBHOOK_PATH && incoming.method === "POST") {
    await answerSignal(incoming, response, context.session);
  } else if (url.pathname === PICTURE) {
    sendPicture(response, context.session, url.searchParams.get("path"));
  } else if (THEME_ROUTES.has(url.pathname)) {
    sendTheme(response, context.session.options.project, url);
  } else if (!url.pathname.startsWith("/api/")) {
    sendFile(response, context.page, url.pathname);
  } else {
    await answerApi(incoming, response, context.routes, url);
  }
}

// A signal GitHub forwarded (gh webhook forward), signed with the
// factory's secret.
async function answerSignal(
  incoming: IncomingMessage,
  response: ServerResponse,
  session: Session,
): Promise<void> {
  let body = "";
  for await (const chunk of incoming) body += String(chunk);
  const header = incoming.headers["x-hub-signature-256"];
  const event = incoming.headers["x-github-event"];
  const taken = session.work.signal(
    typeof event === "string" ? event : "",
    body,
    typeof header === "string" ? header : undefined,
  );
  send(response, taken ? 200 : 403, taken ? {} : { error: "Not GitHub's." });
}

async function answerApi(
  incoming: IncomingMessage,
  response: ServerResponse,
  routes: Record<string, Route>,
  url: URL,
): Promise<void> {
  // /api/parts/<id>/start is the route "POST /api/parts/start".
  const path = url.pathname.replace(/^(\/api\/parts)\/[^/]+(\/\w+)$/, "$1$2");
  const route = routes[`${incoming.method ?? "GET"} ${path}`];
  if (!route) {
    send(response, 404, { error: "There is nothing here." });
    return;
  }
  if (incoming.method === "POST" && incoming.headers[PAGE_HEADER] !== "1") {
    send(response, 403, { error: "Only the factory's page may." });
    return;
  }
  try {
    const body = incoming.method === "POST" ? await readBody(incoming) : null;
    send(response, 200, (await route(body, url)) ?? {});
  } catch (error) {
    const refused = error instanceof Refused;
    const message = error instanceof Error ? error.message : String(error);
    send(response, refused ? 409 : 500, { error: message });
  }
}

function stream(
  response: ServerResponse,
  context: Pick<Context, "watchers">,
): void {
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-store",
    connection: "keep-alive",
  });
  context.watchers.add(response);
  response.on("close", () => context.watchers.delete(response));
  response.write(": connected\n\n");
}

function sendFile(response: ServerResponse, page: string, path: string): void {
  const wanted = normalize(join(page, decodeURIComponent(path)));
  const inside = wanted === page || wanted.startsWith(page + sep);
  const file =
    inside && existsSync(wanted) && statSync(wanted).isFile()
      ? wanted
      : join(page, "index.html");
  if (!existsSync(file)) {
    response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    response.end(
      "The web interface is not built yet: run npm run build in packages/dashboard.",
    );
    return;
  }
  response.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  response.end(readFileSync(file));
}

function sendPicture(
  response: ServerResponse,
  session: Session,
  path: string | null,
): void {
  const file = path ? session.picture(path) : null;
  if (!file || !existsSync(file)) {
    send(response, 404, { error: "There is no such picture." });
    return;
  }
  response.writeHead(200, {
    "content-type":
      PICTURE_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(readFileSync(file));
}

function text(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== "string") throw new Refused(`Say which ${key}.`);
  return value;
}

// Build's buttons: the builder and the coach in the cards switched
// on or off, and the board read again.
function workRoutes(session: Session) {
  return {
    "POST /api/builder": (body: unknown) => {
      session.work.orRefuse().switch("build", on(body));
    },
    "POST /api/coach-in-cards": (body: unknown) => {
      session.work.orRefuse().switch("chat", on(body));
    },
    "POST /api/work/refresh": () => session.work.orRefuse().refresh(),
    "POST /api/work/answer": (body: unknown) => {
      const number = Number((body as { number?: unknown } | null)?.number);
      if (!Number.isInteger(number)) throw new Refused("Say which card.");
      const said = text(body, "text").trim();
      if (said === "") throw new Refused("Write or pick an answer first.");
      return session.work.orRefuse().answer(number, said);
    },
  };
}
