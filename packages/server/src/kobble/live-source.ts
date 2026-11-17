// Reading the live app's export (docs/reference/live-export.md): its address
// and token come from KOBBLE_LIVE_URL and KOBBLE_LIVE_TOKEN, in the
// environment or the project's own .env file (which stays out of git). A
// file: address reads a JSON file of the same shape instead, so Kobble can
// be tried, and tested, without a live app.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  type LiveExport,
  liveExportSchema,
  readSettings,
} from "@software-factory/core";
import { z } from "zod";

export type LiveSettings = { url: string | null; token: string | null };

// The settings, from the environment first, then the project's .env.
export function liveSettings(project: string): LiveSettings {
  const file = readSettings(project, ".env");
  const value = (key: string) => process.env[key] ?? file[key] ?? null;
  return {
    url: value("KOBBLE_LIVE_URL") || null,
    token: value("KOBBLE_LIVE_TOKEN") || null,
  };
}

// A problem reading the export, said in plain words.
export class LiveProblem extends Error {}

// The events since the cursor (all of them without one).
export async function readExport(
  settings: { url: string; token: string | null },
  since: string | null,
): Promise<LiveExport> {
  const data = settings.url.startsWith("file:")
    ? await fromFile(settings.url)
    : await fromServer(settings.url, settings.token, since);
  const parsed = liveExportSchema.safeParse(data);
  if (!parsed.success)
    throw new LiveProblem(
      `The live app's answer does not fit: ${z.prettifyError(parsed.error)}`,
    );
  return parsed.data;
}

async function fromFile(url: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(fileURLToPath(url), "utf8")) as unknown;
  } catch (error) {
    throw new LiveProblem(`The export file cannot be read: ${said(error)}`);
  }
}

async function fromServer(
  url: string,
  token: string | null,
  since: string | null,
): Promise<unknown> {
  let address: URL;
  try {
    address = new URL(url);
  } catch {
    throw new LiveProblem(`KOBBLE_LIVE_URL is not a web address: ${url}`);
  }
  if (since !== null) address.searchParams.set("since", since);
  let response: Response;
  try {
    response = await fetch(address, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new LiveProblem(`The live app cannot be reached: ${said(error)}`);
  }
  if (response.status === 401 || response.status === 403)
    throw new LiveProblem(
      "The live app does not accept the token: check KOBBLE_LIVE_TOKEN.",
    );
  if (!response.ok)
    throw new LiveProblem(
      `The live app answered with an error (${String(response.status)}).`,
    );
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new LiveProblem("The live app's answer is not JSON.");
  }
}

function said(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
