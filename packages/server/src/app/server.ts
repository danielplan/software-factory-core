// The factory's local web server: the web interface's files, the state it
// shows (once, and as a stream of changes), and its buttons. It answers only
// whom reach.ts lets in, and buttons only from its own page (which sends
// PAGE_HEADER), so another web page cannot press them.

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
import { answerAgentTools, isAgentTools } from "../agent-tools.ts";
import { type Cli, realCli } from "../github-cli.ts";
import { readBody, type Route, send } from "../http.ts";
import { on, optionalText, record, text } from "../asked.ts";
import type { ExtensionModule } from "../plugs/extension.ts";
import { Refused } from "../refused.ts";
import type { Session } from "../session.ts";
import { assemble, type TestsRunOn } from "./assemble.ts";
import { admit, lanRoutes, type Reach, THIS_COMPUTER } from "./reach.ts";

export const PAGE_HEADER = "x-software-factory";
// A picture from the project that a setup card shows.
const PICTURE = "/api/setup/picture";
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
  // The extension modules it serves, each while it is installed: Kobble's
  // own and the add-ons (stand-ins in the tests).
  modules: ExtensionModule[];
  // The built web interface (index.html and its files).
  page: string;
  port: number;
  // Who besides this computer may reach it (none in the tests).
  reach?: Reach;
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
  // What is installed may have changed: each extension's background work
  // follows it.
  let reconcile = () => {};
  // The whole state, as the page shows it.
  const changed = () => {
    reconcile();
    tell(`data: ${JSON.stringify(options.session.state())}\n\n`);
  };
  const { session } = options;
  const app = assemble(
    session,
    tell,
    () => {
      changed();
    },
    { ...options, cli: options.cli ?? realCli() },
  );
  reconcile = app.reconcile;
  const reach = options.reach ?? THIS_COMPUTER;
  const routes = {
    ...routesFor(session),
    ...app.routes,
    ...lanRoutes(reach, options.port),
  };
  const server = createServer((incoming, response) => {
    void answer(incoming, response, {
      routes,
      watchers,
      answers: app.answers(),
      supportTools: app.supportTools,
      page: options.page,
      session,
      reach,
    });
  });
  server.on("listening", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const base = `http://localhost:${String(port)}/api`;
    session.serveToolsAt(base);
    app.listen(base);
    session.begin();
    app.start();
  });
  server.on("close", app.close);
  server.listen(options.port, reach.lan ? "0.0.0.0" : "127.0.0.1");
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
  // What the installed extensions answer themselves.
  answers: ReturnType<ReturnType<typeof assemble>["answers"]>;
  supportTools: Parameters<typeof answerAgentTools>[3]["supportTools"];
  page: string;
  session: Session;
  reach: Reach;
};

async function answer(
  incoming: IncomingMessage,
  response: ServerResponse,
  context: Context,
): Promise<void> {
  const url = new URL(incoming.url ?? "/", "http://localhost");
  if (!admit(incoming, response, url, context.reach)) return;
  const own = context.answers.find((one) => one.matches(incoming, url));
  if (url.pathname === "/api/events") {
    stream(response, context);
  } else if (own) {
    await own.answer(incoming, response, url);
  } else if (isAgentTools(incoming, url)) {
    await answerAgentTools(incoming, response, url, context);
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
