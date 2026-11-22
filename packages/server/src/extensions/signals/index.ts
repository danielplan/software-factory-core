// Signals: what the live app reports and what people say (bugs, requests,
// feedback), kept in step with the live app, and what a person does with
// one (Fix, Explore, Dismiss). It owns the `signals` records and offers
// them through its plug; the personas' names come from Personas' plug, an
// exploration from Explorations' (`ideas`), a fix's card from the `tasks`
// slot.

import {
  alreadyFor,
  defineExtension,
  type KobbleStore,
} from "@software-factory/core";

import type { Route } from "../../http.ts";
import { kept } from "../../kobble/records.ts";
import type { Host, Served } from "../../plugs/extension.ts";
import type { IdeasPlug } from "../../plugs/ideas.ts";
import type { SignalsPlug } from "../../plugs/signals.ts";
import { field } from "../../asked.ts";
import { dismissSignal, exploreSignal, fixSignal } from "./actions.ts";
import { connect, disconnect } from "./connect.ts";
import { liveSettings } from "./live-source.ts";
import { signalsPlug as supportPlug } from "./support.ts";
import { LiveSync } from "./sync.ts";
import { handledView, signalsView } from "./views.ts";

export const extension = defineExtension({
  id: "signals",
  name: "Signals",
  about: "What the live app reports.",
  core: true,
  // A fix becomes a card on the board where work is tracked.
  slots: ["tasks"],
  brings: {
    pages: ["signals"],
    blocks: ["signals"],
    kobolds: ["sorter"],
  },
  stages: [
    {
      id: "signals",
      name: "Signals",
      before: ["explore", "build", "done"],
    },
  ],
});

// The signals, as other extensions reach them: new ones get their id and
// the "already" check against the explorations (Explorations' plug) and the
// signals there are.
export function signalsOffer(
  store: () => KobbleStore,
  ideas: () => IdeasPlug | null,
): SignalsPlug {
  return {
    all: () => store().all("signals"),
    get: (id) => store().get("signals", id),
    report: (reported) => {
      const records = store();
      const explorations = ideas()?.all() ?? [];
      const signals = records.all("signals");
      return reported.map((one) => {
        const signal = records.put("signals", {
          ...one,
          id: records.nextId("signals"),
          already: alreadyFor(one.text, explorations, signals),
        });
        signals.push(signal);
        return signal;
      });
    },
    change: (signal) => store().put("signals", signal),
  };
}

export function serve(host: Host): Served {
  const sync = new LiveSync({
    store: host.records,
    settings: () => liveSettings(host.project),
    onSynced: () => {
      host.changed("signals");
    },
  });
  const ideas = () => host.plug("ideas");
  return {
    routes: {
      ...readRoutes(host, sync),
      ...liveRoutes(host, sync),
      ...buttonRoutes(host),
    },
    offers: {
      signals: signalsOffer(host.store, ideas),
      home: {
        blocks: () => ({
          signals: {
            new: (host.records()?.all("signals") ?? []).filter(
              (one) => one.status === "new",
            ).length,
          },
        }),
      },
    },
    support: () =>
      supportPlug({
        store: host.store,
        cards: host.cards,
        isOn: host.isOn,
        ideas,
        changed: host.changed,
      }),
    start: () => {
      sync.start();
    },
    stop: () => {
      sync.close();
    },
  };
}

// The new signals (with the personas' names and the missions going on),
// the handled ones, and a sync now.
function readRoutes(host: Host, sync: LiveSync): Record<string, Route> {
  const personas = () => host.plug("personas")?.all() ?? [];
  return {
    "GET /api/kobble/signals": () =>
      kept(() =>
        signalsView(host.store(), sync.view(), {
          personas: personas(),
          missions: host.plug("missions")?.now() ?? [],
          column: (issue) => host.plug("work")?.column(issue) ?? null,
        }),
      ),
    "POST /api/kobble/sync": async () => {
      const added = await sync.sync();
      return { added: added.length, sync: sync.view() };
    },
    "GET /api/kobble/handled": () =>
      kept(() => handledView(host.store(), personas())),
  };
}

// Connecting the live app and disconnecting it; each sync starts again.
function liveRoutes(host: Host, sync: LiveSync): Record<string, Route> {
  return {
    "POST /api/kobble/connect": async (body) => {
      const { ignored } = await connect(host.project, body);
      sync.start();
      host.changed("signals");
      return { ignored, sync: sync.view() };
    },
    "POST /api/kobble/disconnect": () => {
      disconnect(host.project);
      sync.close();
      host.changed("signals");
      return { sync: sync.view() };
    },
  };
}

// The buttons: Fix, Explore (or Add to), Dismiss. Each change is told to
// the page; a record that does not fit is refused with why.
function buttonRoutes(host: Host): Record<string, Route> {
  const changing =
    (act: Route): Route =>
    async (body, url) => {
      const answer = await kept(() => act(body, url));
      host.changed("signals");
      return answer;
    };
  return {
    "POST /api/kobble/signals/fix": changing(async (body) => ({
      signal: await fixSignal(host.store(), field(body, "id"), host.cards),
    })),
    "POST /api/kobble/signals/explore": changing((body) =>
      exploreSignal(host.store(), field(body, "id"), host.plug("ideas")),
    ),
    "POST /api/kobble/signals/dismiss": changing((body) => ({
      signal: dismissSignal(host.store(), field(body, "id")),
    })),
  };
}
