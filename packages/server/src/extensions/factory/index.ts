// The Factory: the board where work is built. Its builder (builder/) works
// the cards of the board where work is tracked (the `tasks` slot) and opens
// pull requests where the code lives (the `code` slot); the Factory page
// shows the board, a card beside it, and the builder at work. It is always
// installed, and offers the board work through its plug (`work`): the page's
// state, Sprocket, Explorations and Signals reach it there.

import { defineExtension } from "@software-factory/core";

import type { IncomingMessage, ServerResponse } from "node:http";

import { on, text } from "../../asked.ts";
import type { WorkView } from "../../api.ts";
import { type Route, send } from "../../http.ts";
import { kept } from "../../kobble/records.ts";
import type { Host, Served } from "../../plugs/extension.ts";
import type { WorkPlug } from "../../plugs/work.ts";
import { baseBranchFor } from "../../base-branch.ts";
import { Refused } from "../../refused.ts";
import { ConnectedWork } from "./builder/connect-work.ts";
import { WEBHOOK_PATH } from "./builder/signals.ts";
import { supportCards } from "./card-look.ts";
import { factoryCardRoutes } from "./factory-card.ts";
import { boardIdeas, columnOf, factoryView } from "./factory-view.ts";
import { factoryPlug } from "./support.ts";

export const extension = defineExtension({
  id: "factory",
  name: "Factory",
  about: "The board where work is built.",
  core: true,
  always: true,
  slots: ["code", "tasks"],
  brings: {
    pages: ["build"],
    blocks: ["status", "waiting", "loop", "reviews"],
    kobolds: ["builder"],
  },
  stages: [
    {
      id: "build",
      name: "Factory",
      after: ["signals", "explore"],
      before: ["done"],
    },
    { id: "done", name: "Done", after: ["build"] },
  ],
});

export function serve(host: Host): Served {
  const work = new ConnectedWork({
    project: host.project,
    cli: host.cli,
    claude: host.claude,
    available: host.available,
    onChange: host.stateChanged,
    codeHosts: host.slots.code,
    boards: host.slots.tasks,
    ...(host.builderBrowser ? { browser: host.builderBrowser } : {}),
  });
  const offer = workOffer(work);
  const following = followed(host, work);
  return {
    routes: {
      "GET /api/kobble/factory": () =>
        kept(() =>
          factoryView(work.view(), {
            ideas: host.plug("ideas"),
            signals: host.plug("signals"),
          }),
        ),
      ...factoryCardRoutes(host.factory, host.slots.tasks, () =>
        work.hostOrRefuse(),
      ),
      ...workRoutes(work),
    },
    answers: [
      {
        matches: (incoming, url) =>
          url.pathname === WEBHOOK_PATH && incoming.method === "POST",
        answer: (incoming, response) => answerSignal(incoming, response, work),
      },
    ],
    offers: { work: offer, home: { blocks: () => homeBlocks(work.view()) } },
    support: () =>
      factoryPlug(
        supportCards({
          project: host.project,
          cards: host.cards,
          work: () => work.view(),
          answer: offer.answer,
          baseBranch: () => baseBranchFor(host.project, work.hostOrNull()),
        }),
      ),
    // Where GitHub's signals come (gh webhook forward).
    listen: (base) => {
      work.listenAt(base);
    },
    ...following,
  };
}

// The board work, as the core and the other extensions reach it.
function workOffer(work: ConnectedWork): WorkPlug {
  return {
    view: () => work.view(),
    answer: (number, said) => work.orRefuse().answer(number, said),
    refresh: () => {
      work.refresh();
    },
    ideas: () => boardIdeas(work.view()),
    column: (issue) => columnOf(issue, work.view()),
  };
}

// The board work follows the factory: connected when it opens (again when
// its files change), stopped when it closes; from the start, so the page's
// state shows the board as the factory opens.
function followed(host: Host, work: ConnectedWork) {
  let unwatch: (() => void) | null = null;
  const start = () => {
    unwatch ??= host.watch({
      opened: (root) => {
        work.connect(root);
      },
      closed: () => {
        work.stop();
      },
    });
  };
  start();
  return {
    start,
    stop: () => {
      unwatch?.();
      unwatch = null;
      work.stop();
    },
  };
}

// The data of the Factory's Home blocks.
function homeBlocks(view: WorkView | null): Record<string, unknown> {
  return {
    status: { connected: view !== null, problem: view?.problem ?? null },
    waiting: { count: view?.asking?.length ?? 0 },
    reviews: {
      count: (view?.cards ?? []).filter((card) => card.stage === "review")
        .length,
    },
  };
}

// The Factory page's switches: the builder and the coach in the cards on
// or off, the board read again, and an answer on a stuck card.
function workRoutes(work: ConnectedWork): Record<string, Route> {
  return {
    "POST /api/builder": (body) => {
      work.orRefuse().switch("build", on(body));
    },
    "POST /api/coach-in-cards": (body) => {
      work.orRefuse().switch("chat", on(body));
    },
    "POST /api/work/refresh": () => work.orRefuse().refresh(),
    "POST /api/work/answer": (body) => {
      const number = Number((body as { number?: unknown } | null)?.number);
      if (!Number.isInteger(number)) throw new Refused("Say which card.");
      const said = text(body, "text").trim();
      if (said === "") throw new Refused("Write or pick an answer first.");
      return work.orRefuse().answer(number, said);
    },
  };
}

// A signal GitHub forwarded (gh webhook forward), signed with the
// factory's secret.
async function answerSignal(
  incoming: IncomingMessage,
  response: ServerResponse,
  work: ConnectedWork,
): Promise<void> {
  let body = "";
  for await (const chunk of incoming) body += String(chunk);
  const header = incoming.headers["x-hub-signature-256"];
  const event = incoming.headers["x-github-event"];
  const taken = work.signal(
    typeof event === "string" ? event : "",
    body,
    typeof header === "string" ? header : undefined,
  );
  send(response, taken ? 200 : 403, taken ? {} : { error: "Not GitHub's." });
}
