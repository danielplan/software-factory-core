// The GitHub board add-on: work tracked on a GitHub board (a project),
// connected through the GitHub CLI on this computer, which keeps its own
// sign-in. It fills the `tasks` slot (the board's cards, cards.ts) and the
// `code` slot (branches and pull requests, code-host.ts).

import { defineExtension } from "@software-factory/core";

import { stagesOf, field, labelOf } from "../../connect/fields.ts";
import { suggestStages } from "../../connect/stages.ts";
import { Refused } from "../../refused.ts";
import { githubCodeHost } from "./code-host.ts";
import {
  addOnRoutes,
  type ExtensionModule,
  type Host,
} from "../../plugs/extension.ts";
import type { Route } from "../../http.ts";
import { githubCards, type GitHubBoard } from "./cards.ts";
import { GitHub } from "./github.ts";
import { type Cli, realCli } from "../../github-cli.ts";

export function githubAddOn(cli: Cli = realCli()): ExtensionModule {
  return {
    extension: defineExtension({
      id: "github",
      name: "GitHub board",
      about: "Work tracked on a GitHub board, through the GitHub CLI.",
      core: true,
      tracker: true,
      // Where the code lives: the only filler of the slot today.
      fills: ["code"],
    }),
    serve: (host) => ({
      routes: addOnRoutes(
        "github",
        routes(new GitHub(cli, host.stateChanged), host),
      ),
    }),
    codeHost: (repository) => githubCodeHost(cli, repository),
    tasks: (entry) => {
      const board = entry as GitHubBoard;
      return { cards: githubCards(cli, board), repository: board.repository };
    },
  };
}

function routes(github: GitHub, host: Host): Record<string, Route> {
  return {
    "GET /status": () => github.status(),
    "POST /install": () => host.installTool("gh"),
    "POST /sign-in": (body) => {
      github.signIn(field(body, "more") === "yes");
    },
    "GET /repositories": () => github.repositories(),
    "GET /boards": (_body, url) =>
      github.boards(url.searchParams.get("owner") ?? ""),
    "GET /columns": async (_body, url) => {
      const columns = await github.columns(
        url.searchParams.get("repository") ?? "",
        Number(url.searchParams.get("board")),
      );
      return { columns, suggested: suggestStages(columns) };
    },
    "POST /connect": async (body) => {
      const repository = field(body, "repository");
      const board = Number(field(body, "board"));
      if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !Number.isInteger(board))
        throw new Refused("Choose a repository and a board.");
      const message = await github.check(repository, board);
      const stages = stagesOf(body, await github.columns(repository, board));
      host.connect({ repository, board, label: labelOf(body), stages });
      return { message };
    },
  };
}
