// The routes of connecting the factory to where work is tracked: the
// GitHub board through the GitHub CLI, Jira Cloud with an API token. Each
// connection is checked before it is saved.

import { Refused } from "../refused.ts";
import type { Session } from "../session.ts";
import type { GitHub } from "./github.ts";
import { type Fetcher, jiraProjects, siteOf } from "./jira.ts";

type Route = (body: unknown, url: URL) => unknown;

export function connectRoutes(
  session: Session,
  github: GitHub,
  fetcher: Fetcher,
): Record<string, Route> {
  return {
    "GET /api/connect/github": () => github.status(),
    "POST /api/connect/github/install": () => session.installTool("gh"),
    "POST /api/connect/github/sign-in": (body) => {
      github.signIn(field(body, "more") === "yes");
    },
    "GET /api/connect/github/repositories": () => github.repositories(),
    "GET /api/connect/github/boards": (_body, url) =>
      github.boards(url.searchParams.get("owner") ?? ""),
    "POST /api/connect/github": async (body) => {
      const repository = field(body, "repository");
      const board = Number(field(body, "board"));
      if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !Number.isInteger(board))
        throw new Refused("Choose a repository and a board.");
      const message = await github.check(repository, board);
      connected(session, "github", {
        GITHUB_REPOSITORY: repository,
        GITHUB_PROJECT: String(board),
      });
      return { message };
    },
    "POST /api/connect/jira/projects": (body) =>
      jiraProjects(fetcher, loginOf(body)),
    "POST /api/connect/jira": async (body) => {
      const login = loginOf(body);
      const key = field(body, "project");
      const { projects } = await jiraProjects(fetcher, login);
      const project = projects.find((p) => p.key === key);
      if (!project) throw new Refused("Choose one of your Jira projects.");
      connected(session, "jira", {
        JIRA_SITE: siteOf(login.site),
        JIRA_EMAIL: login.email.trim(),
        JIRA_TOKEN: login.token.trim(),
        JIRA_PROJECT: project.key,
      });
      return { message: `Connected to “${project.name}” (${project.key}).` };
    },
    "POST /api/connect/later": () => {
      session.connectLater();
    },
  };
}

// Where work is tracked, checked already, saved with its settings; the
// onboarding is done.
function connected(
  session: Session,
  tracker: "github" | "jira",
  settings: Record<string, string>,
): void {
  const { refused } = session.chooseTracker({ tracker, settings });
  const wrong = Object.entries(refused).map(([key, why]) => `${key}: ${why}`);
  if (wrong.length > 0) throw new Refused(wrong.join(" · "));
  session.connectLater();
}

function loginOf(body: unknown) {
  return {
    site: field(body, "site"),
    email: field(body, "email"),
    token: field(body, "token"),
  };
}

function field(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value : "";
}
