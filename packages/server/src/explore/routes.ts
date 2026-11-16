// Explore's routes: the ideas and one idea, a new idea from a story or a
// team member's own (the kobold writes the story it assumes), a pick, an
// idea thrown away, and a version sent to Build. Prototype mode's routes:
// the versions of an idea with what runs, trying one (it starts), stopping
// it, making another (the kobold makes it) and sharing it. Like every
// button, a POST is answered only from the factory's page (server.ts).

import { z } from "zod";

import type { Route } from "../add-ons/add-on.ts";
import { asked, field } from "../asked.ts";
import type { Cards } from "../cards/cards.ts";
import type { Kobold } from "../kobold/kobold.ts";
import { makeVersion } from "../prototypes/maker.ts";
import type { PrototypeMode } from "../prototypes/mode.ts";
import type { RecordsHost } from "../records/host.ts";
import { parsed } from "../records/person.ts";
import { whoIs } from "../records/who.ts";
import { prototypePage } from "./prototype-page.ts";
import { sendToBuild } from "./send.ts";
import { exploreList, ideaPage } from "./views.ts";
import {
  discardIdea,
  fromStorySchema,
  ideaFromStory,
  shareVersion,
  togglePick,
  versionAsked,
} from "./writes.ts";

export type ExploreOn = {
  host: RecordsHost;
  kobold: Kobold;
  mode: PrototypeMode;
  project: string;
  claude: Parameters<typeof makeVersion>[1];
  // The connected board's cards, or refused with why there are none.
  cards: () => Cards;
};

const ownSchema = z.strictObject({
  text: z.string().trim().min(1),
  persona: z.string().min(1),
});

export function exploreRoutes(on: ExploreOn): Record<string, Route> {
  const store = () => on.host.orRefuse();
  const me = () => whoIs(on.project);
  const version = (body: unknown) => parsed(versionAsked, body, "version");
  return {
    "GET /api/explore": () => exploreList(store().all()),
    "GET /api/explore/idea": async (_body, url) =>
      ideaPage(store().all(), asked(url, "id", "idea"), await me()),
    "POST /api/explore/ideas": (body) => ({
      idea: ideaFromStory(store(), parsed(fromStorySchema, body, "idea")),
    }),
    "POST /api/explore/own": async (body) => {
      const { text, persona } = parsed(ownSchema, body, "idea");
      return { job: on.kobold.imagine({ text, persona, by: await me() }) };
    },
    "POST /api/explore/pick": async (body) => {
      const { idea, version: key } = version(body);
      return { done: togglePick(store(), idea, key, await me()) };
    },
    "POST /api/explore/discard": (body) => {
      discardIdea(store(), field(body, "idea"));
    },
    "POST /api/explore/send": async (body) => ({
      ...(await sendToBuild(store(), on.cards, {
        ...version(body),
        by: await me(),
      })),
    }),
    ...prototypeRoutes(on, version),
  };
}

function prototypeRoutes(
  on: ExploreOn,
  version: (body: unknown) => { idea: string; version: string },
): Record<string, Route> {
  const { mode } = on;
  return {
    "GET /api/prototypes": (_body, url) =>
      prototypePage(mode, asked(url, "idea", "idea")),
    "POST /api/prototypes/start": async (body) => {
      const { idea, version: key } = version(body);
      return { run: await mode.start(idea, key) };
    },
    "POST /api/prototypes/stop": async (body) => {
      const { idea, version: key } = version(body);
      await mode.stop(idea, key);
    },
    "POST /api/prototypes/make": (body) => ({
      version: makeVersion(
        mode,
        on.claude,
        field(body, "idea"),
        field(body, "text"),
      ),
    }),
    "POST /api/prototypes/share": (body) => {
      const { idea, version: key } = version(body);
      return { done: shareVersion(on.host.orRefuse(), idea, key) };
    },
  };
}
