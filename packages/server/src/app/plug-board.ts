// The extension modules served, each with its host: what each plugs in, and
// the plug board that answers another extension's plug while the one
// offering it is installed. Routes and own answers are answered, Sprocket
// hears a plug, Home shows blocks, and background work runs, only while an
// extension is installed; the work follows what is installed when the
// server starts and whenever the page's state changes (reconcile).

import type { Route } from "../http.ts";
import type { SupportPlug } from "../kobble/support-plug.ts";
import type {
  Answer,
  ExtensionModule,
  Host,
  Served,
} from "../plugs/extension.ts";
import type { PlugBoard, PlugName, Plugs } from "../plugs/index.ts";
import { Refused } from "../refused.ts";

// One extension module as served: what it plugs in, and whether its
// background work runs now.
type Plugged = { id: string; name: string; served: Served; running: boolean };

export function servePlugged(
  modules: ExtensionModule[],
  // The host each module is served with; its plug(name) is the board's.
  hostOf: (module: ExtensionModule, plug: PlugBoard) => Host,
  isOn: (id: string) => boolean,
) {
  const plugged: Plugged[] = [];
  // A plug is offered by one installed extension at most.
  const plug: PlugBoard = <N extends PlugName>(name: N) => {
    const found = plugged.find(
      (one) => one.served.offers?.[name] !== undefined && isOn(one.id),
    );
    return (found?.served.offers?.[name] ?? null) as Plugs[N] | null;
  };
  for (const module of modules)
    if (module.serve)
      plugged.push({
        id: module.extension.id,
        name: module.extension.name,
        served: module.serve(hostOf(module, plug)),
        running: false,
      });
  const installed = () => plugged.filter((one) => isOn(one.id));
  // Each installed extension's background work runs; a removed one's stops.
  const reconcile = () => {
    for (const one of plugged) {
      const on = isOn(one.id);
      if (on === one.running) continue;
      one.running = on;
      if (on) one.served.start?.();
      else one.served.stop?.();
    }
  };
  return {
    plug,
    reconcile,
    // Every extension's routes, each answered only while it is installed.
    routes: () => gated(plugged, isOn),
    // The installed extensions' own answers.
    answers: (): Answer[] =>
      installed().flatMap((one) => one.served.answers ?? []),
    // The installed extensions' plugs into Sprocket.
    support: (): SupportPlug[] =>
      installed().flatMap((one) =>
        one.served.support ? [one.served.support()] : [],
      ),
    // The data of the installed extensions' Home blocks.
    home: (): Record<string, unknown> =>
      Object.assign(
        {},
        ...installed().map((one) => one.served.offers?.home?.blocks() ?? {}),
      ) as Record<string, unknown>,
    // Where the server listens (…/api), for every extension's tools.
    listen: (base: string) => {
      for (const one of plugged) one.served.listen?.(base);
    },
    close: () => {
      for (const one of plugged)
        if (one.running) {
          one.running = false;
          one.served.stop?.();
        }
    },
  };
}

// Every extension's routes, each answered only while it is installed.
function gated(
  plugged: Plugged[],
  isOn: (id: string) => boolean,
): Record<string, Route> {
  return Object.fromEntries(
    plugged.flatMap((one) =>
      Object.entries(one.served.routes ?? {}).map(([key, route]) => [
        key,
        (body: unknown, url: URL) => {
          if (!isOn(one.id))
            throw new Refused(`${one.name} is off in this factory.`);
          return route(body, url);
        },
      ]),
    ),
  );
}
