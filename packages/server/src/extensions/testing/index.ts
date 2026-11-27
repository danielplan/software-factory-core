// Testing: a persona lives a few days in the app, the way a customer would,
// and what they run into comes back as signals. Mimic, the tester kobold,
// writes the story and the days, then lives them through a browser. It owns
// the `tests` records and offers them through its plug (`tests`); who is
// tested comes from Personas' plug, what they find goes to Signals' plug,
// and a test on a prototype runs where Explorations' plug (`ideas`) says.

import { extname } from "node:path";

import {
  defineExtension,
  type KobblePersona,
  type KobbleStore,
} from "@software-factory/core";

import { asked } from "../../asked.ts";
import { FileAnswer, type Route } from "../../http.ts";
import { kept } from "../../kobble/records.ts";
import type { Host, Served } from "../../plugs/extension.ts";
import type { TestsPlug } from "../../plugs/tests.ts";
import { Refused } from "../../refused.ts";
import { TestRuns } from "./runs.ts";
import { testingPlug } from "./support.ts";
import { testPage, testsNow, testsView } from "./views.ts";

export const extension = defineExtension({
  id: "testing",
  name: "Testing",
  about: "Personas live a few days in the app.",
  core: true,
  needs: ["personas", "signals"],
  brings: { pages: ["testing"], kobolds: ["tester"] },
});

const SHOT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export function serve(host: Host): Served {
  const personas = () => host.plug("personas")?.all() ?? [];
  const runs = new TestRuns({
    claude: host.claude,
    cwd: host.project,
    store: host.store,
    personas: () => host.plug("personas"),
    signals: () => host.plug("signals"),
    apps: host.apps,
    app: (test) =>
      test.on === "main"
        ? host.app(test.product ?? null)
        : prototype(host, test.on, test.persona),
    browser: host.browser,
    onChange: () => {
      host.changed("tests");
    },
  });
  return {
    routes: testingRoutes(host, runs, personas),
    offers: { tests: testsOffer(host.store, personas, runs) },
    support: () =>
      testingPlug({
        personas: () => host.plug("personas"),
        runs,
        changed: host.changed,
      }),
    // Tests that were running when the factory stopped.
    start: () => {
      if (host.records()) runs.recover();
    },
  };
}

// The tests, as other extensions reach them.
export function testsOffer(
  store: () => KobbleStore,
  personas: () => KobblePersona[],
  runs: Pick<TestRuns, "start">,
): TestsPlug {
  return {
    of: (ids) =>
      store()
        .all("tests")
        .filter((test) => ids.includes(test.id)),
    now: () => testsNow(store(), personas()),
    start: (test) => runs.start(test),
  };
}

// A test on a prototype runs where Explorations opens it.
function prototype(host: Host, on: string, persona: string): Promise<string> {
  const ideas = host.plug("ideas");
  if (!ideas)
    throw new Refused(
      "Explorations is not installed, so there is no prototype to test.",
    );
  return ideas.prototype(on, persona);
}

// The tests, Mimic's story for a new one, start one, one test, and the
// pictures of its screens.
function testingRoutes(
  host: Host,
  runs: TestRuns,
  personas: () => KobblePersona[],
): Record<string, Route> {
  const signals = () => host.plug("signals")?.all() ?? [];
  return {
    "GET /api/kobble/testing": () =>
      kept(() => testsView(host.store(), personas(), signals())),
    "GET /api/kobble/testing/draft": (_body, url) =>
      kept(async () => ({
        draft: await runs.draft(asked(url, "persona", "persona")),
      })),
    "POST /api/kobble/testing": (body) =>
      kept(() => ({ test: runs.start(body) })),
    "GET /api/kobble/testing/test": (_body, url) =>
      kept(() =>
        testPage(host.store(), asked(url, "id", "test"), personas(), signals()),
      ),
    "GET /api/kobble/testing/shot": (_body, url) => {
      const file = host
        .store()
        .testShotFile(asked(url, "id", "test"), asked(url, "name", "picture"));
      if (!file) throw new Refused("There is no such picture.");
      return new FileAnswer(file, SHOT_TYPES[extname(file)] ?? "image/png");
    },
  };
}
