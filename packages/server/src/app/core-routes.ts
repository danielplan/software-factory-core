// The core's own routes and background work, beside the extensions':
// Updates (the sidebar, Settings › Updates: the owner's folder following
// GitHub's main, updates/), the team's choices, the language, the order of
// stages and the pieces of work going through them, the public feedback
// board, and the start file on the desktop.

import { join } from "node:path";

import { FACTORY_FOLDER, readCompany } from "@software-factory/core";

import { connectedCards, type TaskBoards } from "../cards/cards-for.ts";
import { teamRoutes } from "../coach/setup-team.ts";
import { putStartOnDesktop } from "../desktop-start.ts";
import { feedbackRoutes } from "../feedback/routes.ts";
import type { Cli } from "../github-cli.ts";
import type { Route } from "../http.ts";
import { languageRoutes } from "../language.ts";
import type { PlugBoard } from "../plugs/index.ts";
import type { Session } from "../session.ts";
import { stagesRoutes } from "../stages.ts";
import { updatesOf } from "../updates/session-updates.ts";
import { workRoutes } from "../work-book.ts";

export function coreOf(
  session: Session,
  changed: (what: string) => void,
  more: {
    cli: Cli;
    tasks: TaskBoards;
    plug: PlugBoard;
    restartFactory?: (resume: string[]) => Promise<void>;
  },
) {
  const { project } = session.options;
  const cards = () => connectedCards(join(project, FACTORY_FOLDER), more.tasks);
  const updates = updatesOf(
    session,
    () => {
      changed("updates");
    },
    cards,
    more.restartFactory,
  );
  const feedback = feedbackRoutes({
    project,
    cli: more.cli,
    claude: session.options.coach.claude,
    signals: () => more.plug("signals"),
    personas: () => more.plug("personas"),
    changed: () => {
      changed("feedback");
    },
    onSignals: () => {
      changed("signals");
    },
  });
  return {
    routes: {
      ...updates.routes,
      ...teamRoutes(project),
      ...languageRoutes(project),
      ...arrangedInFiles(session, changed, cards),
      ...feedback.routes,
      "POST /api/desktop-start": () => ({
        file: putStartOnDesktop({ project, name: companyName(project) }),
      }),
    } as Record<string, Route>,
    start: () => {
      updates.start();
      feedback.arrivals.start();
    },
    close: () => {
      updates.close();
      feedback.arrivals.close();
    },
  };
}

// What the team arranges, kept in the factory's files: the order of
// stages, and the cards as the pieces of work going through them.
function arrangedInFiles(
  session: Session,
  changed: (what: string) => void,
  cards: () => ReturnType<typeof connectedCards>,
): Record<string, Route> {
  const factory = () => {
    const state = session.state();
    return state.mode === "factory" ? state : null;
  };
  return {
    ...stagesRoutes(session),
    ...workRoutes({
      cards,
      kobbles: () =>
        (factory()?.addOns ?? [])
          .filter((one) => one.builtIn)
          .flatMap((one) => one.screens.stages.map((stage) => stage.id)),
      course: () =>
        (factory()?.stages.order ?? []).map(({ id, checks }) => ({
          id,
          checks,
        })),
      changed,
    }),
  };
}

// The company's name, for the start file; the project's folder without one.
function companyName(project: string): string {
  const read = readCompany(join(project, FACTORY_FOLDER, "factory.json"));
  return "company" in read ? read.company.name : "";
}
