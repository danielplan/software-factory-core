// A factory with the example company's explorations, a pretend Claude
// that plays the given turns, and short ways to press the explorations'
// buttons and read their pages. Its prototypes' branches are in the
// project, as they are once made.

import { cpSync } from "node:fs";
import { join } from "node:path";

import { KobbleStore, readCompany, saveCompany } from "@software-factory/core";

import { git } from "../src/prototypes/copies.ts";

import type { ExplorationPage } from "../src/extensions/explorations/views.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { kobbleStage } from "./stage.ts";

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

type Turn = Parameters<typeof pretendClaude>[0][number];

// The start command the example project names unless a test says otherwise
// (or says none, with `null`): one that stops at once, as a project whose
// app does not come up.
const NOT_RUNNING = 'echo "no server here" >&2; exit 1';

export async function explorationsFactory(
  turns: Turn[] = [],
  start: string | null = NOT_RUNNING,
) {
  const pretend = pretendClaude(turns);
  // With Kobble's own extensions, Explorations among them.
  const staged = await kobbleStage(pretend.claude);
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  if (start !== null) {
    const read = readCompany(join(root, "factory.json"));
    if ("problem" in read) throw new Error(read.problem);
    saveCompany(root, { ...read.company, prototype: { start } });
  }
  const store = new KobbleStore(root);
  madeBranches(staged.project, store);
  const read = async <T>(path: string) =>
    (await (await fetch(`${staged.base}${path}`)).json()) as T;
  const press = async (path: string, body: unknown = {}) => {
    const response = await staged.post(`/api/kobble/explorations${path}`, body);
    return {
      status: response.status,
      body: (await response.json()) as Record<string, unknown>,
    };
  };
  const page = (id: string) =>
    read<ExplorationPage>(`/api/kobble/exploration?id=${id}`);
  // The page once the kobold is not writing any more.
  const settled = async (id: string) => {
    for (;;) {
      const now = await page(id);
      if (now.talk.writing === null) return now;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  const close = () => {
    staged.session.close();
    staged.server.close();
  };
  return {
    ...staged,
    ...pretend,
    root,
    store,
    read,
    press,
    page,
    settled,
    close,
  };
}

// The example's prototypes were made: their branches are in the project
// (a prototype whose branch is nowhere was never made, unmade.ts).
function madeBranches(project: string, store: KobbleStore): void {
  git(project, ["init", "--quiet", "-b", "main"]);
  git(project, [
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@t",
    "commit",
    "--quiet",
    "--allow-empty",
    "-m",
    "Start",
  ]);
  for (const exploration of store.all("explorations"))
    for (const thing of store.board(exploration.id).things)
      if (thing.kind === "prototype") git(project, ["branch", thing.branch]);
}

// The same, in a project with no start command where Tinker, asked first to
// work one out, could not (the turns given are for the makers after it).
export function factoryWithoutStart(turns: Turn[] = []) {
  return explorationsFactory(
    [{ calls: [], reply: "Could not start: Nothing here says how." }, ...turns],
    null,
  );
}
