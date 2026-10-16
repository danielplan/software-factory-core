// Where a company's work is tracked besides the factory's own board: the
// settings of a GitHub board and of Jira Cloud, connected after setup and
// changed on the Settings tab, with the label that marks the work the
// factory takes in. The runner, which works on the cards, comes later and
// reads them from here.

import { defineExtension } from "@software-factory/core";

const FILE = "settings/tracker.env";

export const trackers = defineExtension({
  id: "trackers",
  name: "Trackers",
  about: "Where the company's work is tracked: a GitHub board or Jira Cloud.",
  core: true,
  settings: [
    {
      id: "github",
      name: "GitHub board",
      about:
        "The repository and the board the factory works with: ideas become cards there, and the runner builds them.",
      file: FILE,
      usedBy: [],
      fields: [
        {
          key: "GITHUB_REPOSITORY",
          label: "Repository",
          help: "Where the issues and pull requests are, as owner/name.",
          kind: "text",
          pattern: "^[\\w.-]+/[\\w.-]+$",
        },
        {
          key: "GITHUB_PROJECT",
          label: "Board number",
          help: "The number at the end of the board's address (…/projects/1).",
          kind: "number",
          default: "1",
          min: 1,
          max: 9999,
        },
        {
          key: "GITHUB_LABEL",
          label: "Only cards labelled",
          help: "The factory takes in only the cards with this label; * takes every card.",
          kind: "text",
          default: "factory",
          pattern: "^(\\*|[\\w .:-]+)$",
        },
      ],
    },
    {
      id: "jira",
      name: "Jira Cloud",
      about:
        "The Jira project the factory works with: ideas become issues there, moved through your own workflow's statuses.",
      file: FILE,
      usedBy: [],
      fields: [
        {
          key: "JIRA_SITE",
          label: "Site",
          help: "Your Jira's address, for example acme.atlassian.net.",
          kind: "text",
          pattern: "^[\\w-]+\\.atlassian\\.net$",
        },
        {
          key: "JIRA_PROJECT",
          label: "Project key",
          help: "The letters before an issue's number (ACME in ACME-12).",
          kind: "text",
          pattern: "^[A-Z][A-Z0-9]+$",
        },
        {
          key: "JIRA_EMAIL",
          label: "Your email",
          help: "The email you sign in to Jira with.",
          kind: "text",
          pattern: "^[^@\\s]+@[^@\\s]+$",
        },
        {
          key: "JIRA_TOKEN",
          label: "API token",
          help: "Made at id.atlassian.com, Security, API tokens. Kept only on this computer.",
          kind: "secret",
        },
        {
          key: "JIRA_LABEL",
          label: "Only issues labelled",
          help: "The factory takes in only the issues with this label; * takes every issue.",
          kind: "text",
          default: "factory",
          pattern: "^(\\*|[\\w.:-]+)$",
        },
      ],
    },
  ],
});
