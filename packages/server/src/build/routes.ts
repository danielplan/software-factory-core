// Build's routes beside the board: what the records know of its issues,
// the kobold's draft of what was seen for "did it work?", the answer, and a
// fix ticket for a bug or an update sent from Understand. Like every
// button, a POST is answered only from the factory's page (server.ts).

import type { Route } from "../add-ons/add-on.ts";
import { field } from "../asked.ts";
import type { Cards } from "../cards/cards.ts";
import type { Kobold } from "../kobold/kobold.ts";
import type { RecordsHost } from "../records/host.ts";
import { parsed } from "../records/person.ts";
import { whoIs } from "../records/who.ts";
import { Refused } from "../refused.ts";
import { answerDidItWork, answerSchema, makeFixTicket } from "./answer.ts";
import { draftSeen } from "./seen.ts";
import { buildView } from "./views.ts";

export type BuildOn = {
  host: RecordsHost;
  kobold: Kobold;
  project: string;
  // The connected board's cards, or refused with why there are none.
  cards: () => Cards;
};

export function buildRoutes(on: BuildOn): Record<string, Route> {
  const store = () => on.host.orRefuse();
  const me = () => whoIs(on.project);
  return {
    "GET /api/build": () => buildView(store().all()),
    "POST /api/build/draft": async (body) => {
      const records = store().all();
      const issue = (body as { issue?: unknown } | null)?.issue;
      const link = records.ticketLinks.find((t) => t.issue === issue);
      if (!link || link.kind !== "idea")
        throw new Refused("Say which idea's issue.");
      return await draftSeen(records, link, on.kobold);
    },
    "POST /api/build/answer": async (body) =>
      await answerDidItWork(
        store(),
        on.cards,
        parsed(answerSchema, body, "answer"),
        await me(),
      ),
    "POST /api/build/fix": async (body) =>
      await makeFixTicket(store(), on.cards, field(body, "signal"), await me()),
  };
}
