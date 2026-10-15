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

import { answerTools } from "./coach/setup-tools.ts";
import { listFolders } from "./folders.ts";
import { Refused } from "./refused.ts";
import type { Session } from "./session.ts";

export const PAGE_HEADER = "x-software-factory";
// The setup coach's tools, which check the coach's own token instead.
const COACH_TOOLS = "/api/setup/mcp";
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

type Route = (body: unknown, url: URL) => unknown;

export function startServer(options: {
  session: Session;
  // The built web interface (index.html and its files).
  page: string;
  port: number;
}): { server: Server; changed: () => void } {
  const watchers = new Set<ServerResponse>();
  const changed = () => {
    const data = `data: ${JSON.stringify(options.session.state())}\n\n`;
    for (const response of watchers) response.write(data);
  };
  const routes = routesFor(options.session);
  const server = createServer((incoming, response) => {
    void answer(incoming, response, { routes, watchers, ...options });
  });
  server.on("listening", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    options.session.coach.serveToolsAt(
      `http://localhost:${String(port)}${COACH_TOOLS}`,
    );
  });
  server.listen(options.port, "127.0.0.1");
  return { server, changed };
}

function routesFor(session: Session): Record<string, Route> {
  const launcher = () => session.launcherOrRefuse();
  const part = (url: URL) =>
    decodeURIComponent(url.pathname.split("/")[3] ?? "");
  return {
    "GET /api/state": () => session.state(),
    "GET /api/folders": (_body, url) =>
      listFolders(url.searchParams.get("path")),
    "POST /api/setup/detect": (body) => session.detect(text(body, "folder")),
    "POST /api/setup/say": (body) => session.coach.say(text(body, "text")),
    "POST /api/setup/draft": (body) => {
      session.ownerChangesDraft(
        body as Parameters<Session["ownerChangesDraft"]>[0],
      );
    },
    "POST /api/setup/make": () => session.makeFromDraft(),
    "POST /api/company": (body) =>
      session.createCompany(body as Parameters<Session["createCompany"]>[0]),
    "POST /api/products": (body) =>
      session.addProducts(body as Parameters<Session["addProducts"]>[0]),
    "POST /api/company/tracker": (body) =>
      session.chooseTracker(body as Parameters<Session["chooseTracker"]>[0]),
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
  } else if (url.pathname === COACH_TOOLS && incoming.method === "POST") {
    const body = await readBody(incoming).catch(() => null);
    await answerTools(incoming, response, context.session.coach, body);
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

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readBody(incoming: IncomingMessage): Promise<unknown> {
  let text = "";
  for await (const chunk of incoming) text += String(chunk);
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Refused("That request was not understood.");
  }
}

function text(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== "string") throw new Refused(`Say which ${key}.`);
  return value;
}

function record(body: unknown, key: string): Record<string, unknown> {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== "object" || value === null)
    throw new Refused(`Say the ${key}.`);
  return value as Record<string, unknown>;
}
