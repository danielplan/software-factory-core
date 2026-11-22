// Kobble's routes for the factory's server: the project, the kobold's
// Claude Code, and what persona tests run on (the product as the launcher
// starts it, and Playwright's browser), unless the tests give stand-ins.

import type { Cli } from "../add-ons/github/github.ts";
import type { Session } from "../session.ts";
import { join } from "node:path";

import { FACTORY_FOLDER, readCompany } from "@software-factory/core";

import { teamRoutes } from "../coach/setup-team.ts";
import { feedbackRoutes } from "../feedback/routes.ts";
import { homeLayoutRoutes } from "../home-layout.ts";
import { stagesRoutes } from "../stages.ts";
import { workRoutes } from "../work-book.ts";
import { languageRoutes } from "../language.ts";
import { factoryCardRoutes } from "./factory-card.ts";
import { putStartOnDesktop } from "../desktop-start.ts";
import { updatesOf } from "../updates/session-updates.ts";
import { guidesFor } from "../builder/extension-guides.ts";
import { connectedCards } from "./connected-cards.ts";
import { servedKobble, tellerOf } from "./routes.ts";
import { releasesRoutes } from "../releases/routes.ts";
import { storeOf } from "./usage-routes.ts";
import { appAddress, appsOf, playwrightBrowser } from "./test-setup.ts";

export type TestsRunOn = Parameters<typeof servedKobble>[0]["testsRunOn"];

// What the team arranges, kept in the factory's files: Home's blocks and the
// order of stages; and the cards, as the pieces of work going through them.
function arrangedInFiles(
  session: Session,
  tell: (event: string) => void,
  cli: Cli,
) {
  const factory = () => {
    const state = session.state();
    return state.mode === "factory" ? state : null;
  };
  return {
    ...homeLayoutRoutes(session.options.project, tellerOf(tell), () =>
      (factory()?.addOns ?? []).flatMap((one) => one.brings.blocks),
    ),
    ...stagesRoutes(session),
    ...workRoutes({
      cards: () =>
        connectedCards(join(session.options.project, FACTORY_FOLDER), cli),
      kobbles: () =>
        (factory()?.addOns ?? [])
          .filter((one) => one.builtIn)
          .flatMap((one) => one.screens.stages.map((stage) => stage.id)),
      course: () =>
        (factory()?.stages.order ?? []).map(({ id, checks }) => ({
          id,
          checks,
        })),
      changed: tellerOf(tell),
    }),
  };
}

function kobbleAlone(
  session: Session,
  tell: (event: string) => void,
  more: { cli: Cli; testsRunOn?: TestsRunOn },
) {
  const { testsRunOn } = more;
  return servedKobble({
    project: session.options.project,
    tell,
    claude: session.options.coach.claude,
    cli: more.cli,
    work: () => session.work.view(),
    answer: (number, text) => session.work.orRefuse().answer(number, text),
    isOn: (id) => session.isOn(id),
    supportGuides: () =>
      guidesFor(session.options.project, session.options.available, "support"),
    testsRunOn: testsRunOn ?? {
      apps: () => appsOf(() => session.launcherOrRefuse()),
      app: (product) => appAddress(() => session.launcherOrRefuse(), product),
      browser: playwrightBrowser,
    },
  });
}

// Kobble, with Updates beside it (the sidebar, Settings › Updates): the owner's folder following
// GitHub's main (updates/), told to the page like Kobble's changes.
export function kobbleOf(
  session: Session,
  tell: (event: string) => void,
  more: {
    cli: Cli;
    testsRunOn?: TestsRunOn;
    restartFactory?: (resume: string[]) => Promise<void>;
  },
) {
  const kobble = kobbleAlone(session, tell, more);
  const feedback = feedbackOf(session, tell, more.cli);
  const updates = updatesOf(
    session,
    () => {
      tell(`event: kobble-changed\ndata: {"what":"updates"}\n\n`);
    },
    () =>
      connectedCards(join(session.options.project, FACTORY_FOLDER), more.cli),
    more.restartFactory,
  );
  return {
    ...kobble,
    routes: {
      ...kobble.routes,
      ...updates.routes,
      ...teamRoutes(session.options.project),
      ...languageRoutes(session.options.project),
      ...arrangedInFiles(session, tell, more.cli),
      ...feedback.routes,
      ...releasesRoutes({
        project: session.options.project,
        cli: more.cli,
        claude: session.options.coach.claude,
        changed: tellerOf(tell),
      }),
      ...factoryCardRoutes(
        join(session.options.project, FACTORY_FOLDER),
        more.cli,
        () => session.work.hostOrRefuse(),
      ),
      "POST /api/desktop-start": () => ({
        file: putStartOnDesktop({
          project: session.options.project,
          name: companyName(session.options.project),
        }),
      }),
    },
    start: () => {
      kobble.start();
      updates.start();
      feedback.arrivals.start();
    },
    close: () => {
      kobble.close();
      updates.close();
      feedback.arrivals.close();
    },
  };
}

// The public feedback board: sending to it, and its posts arriving as
// signals.
function feedbackOf(session: Session, tell: (event: string) => void, cli: Cli) {
  const { project } = session.options;
  const factory = join(project, FACTORY_FOLDER);
  const told = (what: string) => {
    tell(`event: kobble-changed\ndata: {"what":"${what}"}\n\n`);
  };
  return feedbackRoutes({
    project,
    cli,
    claude: session.options.coach.claude,
    store: () => storeOf(factory, project),
    changed: () => {
      told("feedback");
    },
    onSignals: () => {
      told("signals");
    },
  });
}

// The company's name, for the start file; the project's folder without one.
function companyName(project: string): string {
  const read = readCompany(join(project, FACTORY_FOLDER, "factory.json"));
  return "company" in read ? read.company.name : "";
}
