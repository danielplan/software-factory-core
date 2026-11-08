// The Jira Cloud add-on: work tracked in a Jira project, connected with an
// API token that Jira checks; the token is kept in its settings, on this
// computer only.

import { defineExtension } from "@software-factory/core";

import { stagesOf, field, labelOf } from "../../connect/fields.ts";
import { suggestStages } from "../../connect/stages.ts";
import { Refused } from "../../refused.ts";
import type { AddOn, AddOnHost, Route } from "../add-on.ts";
import { type Fetcher, jiraColumns, jiraProjects, siteOf } from "./jira.ts";

export function jiraAddOn(fetcher: Fetcher = fetch): AddOn {
  return {
    extension: defineExtension({
      id: "jira",
      name: "Jira Cloud",
      about: "Work tracked in a Jira Cloud project, with an API token.",
      core: true,
      tracker: true,
      settings: [
        {
          id: "jira",
          name: "Jira Cloud",
          about:
            "The Jira project the factory works with: ideas become issues there, moved through your own workflow's statuses.",
          file: "settings/jira.env",
          usedBy: [],
          fields: [
            {
              key: "JIRA_TOKEN",
              label: "API token",
              help: "Made at id.atlassian.com, Security, API tokens. Kept only on this computer.",
              kind: "secret",
            },
          ],
        },
      ],
    }),
    routes: (host) => routes(fetcher, host),
  };
}

function routes(fetcher: Fetcher, host: AddOnHost): Record<string, Route> {
  return {
    "POST /projects": (body) => jiraProjects(fetcher, loginOf(body)),
    "POST /columns": async (body) => {
      const columns = await jiraColumns(
        fetcher,
        loginOf(body),
        field(body, "project"),
      );
      return { columns, suggested: suggestStages(columns) };
    },
    "POST /connect": async (body) => {
      const login = loginOf(body);
      const key = field(body, "project");
      const { projects } = await jiraProjects(fetcher, login);
      const project = projects.find((p) => p.key === key);
      if (!project) throw new Refused("Choose one of your Jira projects.");
      const columns = await jiraColumns(fetcher, login, project.key);
      host.connect(
        {
          site: siteOf(login.site),
          email: login.email.trim(),
          project: project.key,
          label: labelOf(body),
          stages: stagesOf(body, columns),
        },
        { JIRA_TOKEN: login.token.trim() },
      );
      return { message: `Connected to “${project.name}” (${project.key}).` };
    },
  };
}

function loginOf(body: unknown) {
  return {
    site: field(body, "site"),
    email: field(body, "email"),
    token: field(body, "token"),
  };
}
