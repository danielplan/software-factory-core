// The GitHub board add-on: work tracked on a GitHub board (a project),
// connected through the GitHub CLI on this computer, which keeps its own
// sign-in.

import { defineExtension } from "@software-factory/core";

import { stagesOf, field, labelOf } from "../../connect/fields.ts";
import { suggestStages } from "../../connect/stages.ts";
import { Refused } from "../../refused.ts";
import type { AddOn, AddOnHost, Route } from "../add-on.ts";
import { type Cli, GitHub, realCli } from "./github.ts";

export function githubAddOn(cli: Cli = realCli()): AddOn {
  return {
    extension: defineExtension({
      id: "github",
      name: "GitHub board",
      about: "Work tracked on a GitHub board, through the GitHub CLI.",
      core: true,
      tracker: true,
    }),
    routes: (host) => routes(new GitHub(cli, host.changed), host),
  };
}

function routes(github: GitHub, host: AddOnHost): Record<string, Route> {
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
