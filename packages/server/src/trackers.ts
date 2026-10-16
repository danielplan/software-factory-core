// The secrets of where work is tracked, kept on this computer only: Jira's
// API token (the GitHub CLI keeps its own sign-in). Which board, its label
// and its columns are in the factory's board.json (connect/board-file.ts).

import { defineExtension } from "@software-factory/core";

const FILE = "settings/tracker.env";

export const trackers = defineExtension({
  id: "trackers",
  name: "Trackers",
  about: "Where the company's work is tracked: a GitHub board or Jira Cloud.",
  core: true,
  settings: [
    {
      id: "jira",
      name: "Jira Cloud",
      about:
        "The Jira project the factory works with: ideas become issues there, moved through your own workflow's statuses.",
      file: FILE,
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
});
