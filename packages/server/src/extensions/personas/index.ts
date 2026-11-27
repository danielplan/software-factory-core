// Personas: the real customers the product is for, each with a name, a
// place and a few lines about them. It owns the `personas` records and
// offers them through its plug (`personas`); Testing sends them into the
// app, Signals and Explorations show who something is from or for.

import { defineExtension, type KobbleStore } from "@software-factory/core";

import { asked } from "../../asked.ts";
import type { Route } from "../../http.ts";
import { kept } from "../../kobble/records.ts";
import type { Host, Served } from "../../plugs/extension.ts";
import type { PersonasPlug } from "../../plugs/personas.ts";
import { addPersona } from "./actions.ts";
import { personasPlug as supportPlug } from "./support.ts";
import { personaPage, personasView } from "./views.ts";

export const extension = defineExtension({
  id: "personas",
  name: "Personas",
  about: "The real customers the app is for.",
  core: true,
  needs: ["signals"],
  brings: { pages: ["personas"] },
});

// The personas, as other extensions reach them.
export function personasOffer(store: () => KobbleStore): PersonasPlug {
  return {
    all: () => store().all("personas"),
    get: (id) => store().get("personas", id),
    add: (persona) => addPersona(store(), persona),
  };
}

export function serve(host: Host): Served {
  return {
    routes: personaRoutes(host),
    offers: { personas: personasOffer(host.store) },
    support: () => supportPlug({ store: host.store, changed: host.changed }),
  };
}

// The personas, one persona, and New persona.
function personaRoutes(host: Host): Record<string, Route> {
  const signals = () => host.plug("signals")?.all() ?? [];
  return {
    "GET /api/kobble/personas": () =>
      kept(() => personasView(host.store(), signals())),
    "GET /api/kobble/persona": (_body, url) =>
      kept(() =>
        personaPage(host.store(), asked(url, "id", "persona"), signals()),
      ),
    "POST /api/kobble/personas": async (body) => {
      const answer = await kept(() => ({
        persona: addPersona(host.store(), body),
      }));
      host.changed("personas");
      return answer;
    },
  };
}
