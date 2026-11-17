// Connecting Kobble to the live app from the Signals page, and
// disconnecting it in Settings. Connecting reads the export once with the
// token (so a wrong address or token is said at once, in plain words), then
// keeps both in the project's own .env, which stays on this computer: the
// project's .gitignore names it. The token is never sent back to the page.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { changeEnvText } from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../refused.ts";
import { LiveProblem, readExport } from "./live-source.ts";

const ENV = ".env";
const KEYS = ["KOBBLE_LIVE_URL", "KOBBLE_LIVE_TOKEN"] as const;

const connectSchema = z.object({
  url: z.string().trim().min(1, "Say the address of the export."),
  token: z.string().trim().min(1, "Paste the token from your app."),
});

// Checks the address with the token, then keeps both in .env; whether .env
// had to be added to the project's .gitignore.
export async function connect(
  project: string,
  body: unknown,
): Promise<{ ignored: boolean }> {
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success)
    throw new Refused(parsed.error.issues.map((i) => i.message).join(" "));
  const { url, token } = parsed.data;
  if (url.startsWith("file:"))
    throw new Refused("Use the web address of your app's export.");
  try {
    await readExport({ url, token }, null);
  } catch (error) {
    if (error instanceof LiveProblem) throw new Refused(error.message);
    throw error;
  }
  writeEnv(project, { KOBBLE_LIVE_URL: url, KOBBLE_LIVE_TOKEN: token });
  return { ignored: keepOutOfGit(project) };
}

// The two settings taken out of .env.
export function disconnect(project: string): void {
  if (process.env.KOBBLE_LIVE_URL)
    throw new Refused(
      "KOBBLE_LIVE_URL is set where the factory was started, not in .env: unset it there.",
    );
  writeEnv(project, Object.fromEntries(KEYS.map((key) => [key, null])));
}

function writeEnv(project: string, changes: Record<string, string | null>) {
  const file = join(project, ENV);
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  writeFileSync(file, changeEnvText(text, changes));
}

// The project's .gitignore names .env; true when it had to be added.
function keepOutOfGit(project: string): boolean {
  const file = join(project, ".gitignore");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const named = text
    .split(/\r?\n/)
    .some((line) => [".env", "/.env", ".env*", "*.env"].includes(line.trim()));
  if (named) return false;
  const before = text === "" || text.endsWith("\n") ? text : `${text}\n`;
  writeFileSync(file, `${before}.env\n`);
  return true;
}
