// A factory with Kobble's own extensions and the example company's Kobble
// files, and short ways to read its pages and press its buttons.

import { cpSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { KobbleStore } from "@software-factory/core";

import { kobbleStage } from "./stage.ts";

export const ACME = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "examples",
  "acme",
);
export const EXPORT = join(ACME, "live-export.json");

// A factory with the example company's Kobble files, and the live app set
// in the project's .env when an address is given.
export async function kobbleFactory(live?: string) {
  const staged = await kobbleStage();
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  if (live)
    writeFileSync(
      join(staged.project, ".env"),
      `KOBBLE_LIVE_URL=${live}\nKOBBLE_LIVE_TOKEN=secret\n`,
    );
  const read = async <T>(path: string) =>
    (await (await fetch(`${staged.base}${path}`)).json()) as T;
  const press = async (path: string, body: unknown = {}) => {
    const response = await staged.post(path, body);
    return {
      status: response.status,
      body: (await response.json()) as Record<string, unknown>,
    };
  };
  const close = () => {
    staged.session.close();
    staged.server.close();
  };
  return { ...staged, root, read, press, close, store: new KobbleStore(root) };
}
