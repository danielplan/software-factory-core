// The routes of connecting the factory to where work is tracked: the
// GitHub board through the GitHub CLI, Jira Cloud with an API token. Each
// connection is checked before it is saved.

import { Refused } from "../refused.ts";
import type { Session } from "../session.ts";
import type { GitHub } from "./github.ts";
import { type Fetcher, jiraColumns, jiraProjects, siteOf } from "./jira.ts";
import { stagesFrom, suggestStages } from "./stages.ts";

type Route = (body: unknown, url: URL) => unknown;

export function connectRoutes(
  session: Session,
  github: GitHub,
  fetcher: Fetcher,
): Record<string, Route> {
  return {
    ...githubRoutes(session, github),
    ...jiraRoutes(session, fetcher),
    "POST /api/connect/own-board": () => {
      session.chooseBoard("none");
    },
  };
}

// A GitHub board through the GitHub CLI.
function githubRoutes(session: Session, github: GitHub): Record<string, Route> {
  return {
    "GET /api/connect/github": () => github.status(),
    "POST /api/connect/github/install": () => session.installTool("gh"),
    "POST /api/connect/github/sign-in": (body) => {
      github.signIn(field(body, "more") === "yes");
    },
    "GET /api/connect/github/repositories": () => github.repositories(),
    "GET /api/connect/github/boards": (_body, url) =>
      github.boards(url.searchParams.get("owner") ?? ""),
    "GET /api/connect/github/columns": async (_body, url) => {
      const columns = await github.columns(
        url.searchParams.get("repository") ?? "",
        Number(url.searchParams.get("board")),
      );
      return { columns, suggested: suggestStages(columns) };
    },
    "POST /api/connect/github": async (body) => {
      const repository = field(body, "repository");
      const board = Number(field(body, "board"));
      if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !Number.isInteger(board))
        throw new Refused("Choose a repository and a board.");
      const message = await github.check(repository, board);
      const stages = mapped(body, await github.columns(repository, board));
      session.chooseBoard("github", {
        github: { repository, board, label: labelOf(body), stages },
      });
      return { message };
    },
  };
}

// Jira Cloud with an API token.
function jiraRoutes(session: Session, fetcher: Fetcher): Record<string, Route> {
  return {
    "POST /api/connect/jira/columns": async (body) => {
      const columns = await jiraColumns(
        fetcher,
        loginOf(body),
        field(body, "project"),
      );
      return { columns, suggested: suggestStages(columns) };
    },
    "POST /api/connect/jira/projects": (body) =>
      jiraProjects(fetcher, loginOf(body)),
    "POST /api/connect/jira": async (body) => {
      const login = loginOf(body);
      const key = field(body, "project");
      const { projects } = await jiraProjects(fetcher, login);
      const project = projects.find((p) => p.key === key);
      if (!project) throw new Refused("Choose one of your Jira projects.");
      const stages = mapped(
        body,
        await jiraColumns(fetcher, login, project.key),
      );
      session.chooseBoard(
        "jira",
        {
          jira: {
            site: siteOf(login.site),
            email: login.email.trim(),
            project: project.key,
            label: labelOf(body),
            stages,
          },
        },
        { JIRA_TOKEN: login.token.trim() },
      );
      return { message: `Connected to “${project.name}” (${project.key}).` };
    },
  };
}

// The stages as the owner matched them to the board's columns.
function mapped(body: unknown, columns: string[]) {
  try {
    return stagesFrom(
      (body as Record<string, unknown> | null)?.stages,
      columns,
    );
  } catch (error) {
    throw new Refused(error instanceof Error ? error.message : String(error));
  }
}

// The label that marks the factory's work: "factory" unless the owner
// chose another, or * for all of it.
function labelOf(body: unknown): string {
  const label = field(body, "label").trim() || "factory";
  if (!/^(\*|[\w .:-]+)$/.test(label))
    throw new Refused(
      `“${label}” cannot be a label: use letters, digits, spaces, . : - or *.`,
    );
  return label;
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
