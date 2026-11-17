// Kobble's routes for the factory's server: the project, the kobold's
// Claude Code, and what persona tests run on (the product as the launcher
// starts it, and Playwright's browser), unless the tests give stand-ins.

import type { Cli } from "../add-ons/github/github.ts";
import type { Session } from "../session.ts";
import { servedKobble } from "./routes.ts";
import { appAddress, playwrightBrowser } from "./test-setup.ts";

export type TestsRunOn = Parameters<typeof servedKobble>[0]["testsRunOn"];

export function kobbleOf(
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
    testsRunOn: testsRunOn ?? {
      app: () => appAddress(() => session.launcherOrRefuse()),
      browser: playwrightBrowser,
    },
  });
}
