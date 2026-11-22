// A factory with the example company's explorations, a pretend Claude
// that plays the given turns, and short ways to press the explorations'
// buttons and read their pages.

import { cpSync } from "node:fs";
import { join } from "node:path";

import { KobbleStore } from "@software-factory/core";

import type { ExplorationPage } from "../src/extensions/explorations/views.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { kobbleStage } from "./stage.ts";

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

type Turn = Parameters<typeof pretendClaude>[0][number];

export async function explorationsFactory(turns: Turn[] = []) {
  const pretend = pretendClaude(turns);
  // With Kobble's own extensions, Explorations among them.
  const staged = await kobbleStage(pretend.claude);
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  const store = new KobbleStore(root);
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
