// What a kobold that looks at an app works with (the tests, the
// maker, the builder): the products as the factory starts them on this
// computer (the launcher, with the kit's command and port), and a browser:
// Playwright's MCP server, the browser Claude Code's own Playwright
// integration uses, started headless and without a saved profile, over HTTP
// on a free port.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { type AddressInfo, createServer } from "node:net";
import { join } from "node:path";

import type { Launcher } from "@software-factory/launcher";

import { NPX } from "../programs.ts";

// A reason a test cannot go on, said in plain words.
export class TestProblem extends Error {}

// A browser a kobold uses through MCP, at its address.
export type Browser = { url: string; close: () => void };

// How a test wants its browser: the folder its screenshots go to, and the
// language and time zone of the person using it (it-IT, Europe/Rome), so
// dates, numbers and "today" look the way they would to them.
export type BrowserWish = {
  shots?: string;
  locale?: string | null;
  timeZone?: string | null;
};

// An app a persona can be sent into: a product the factory starts with a
// web address.
export type App = { id: string; name: string; does: string };

// The version used; npx keeps it once fetched.
const PLAYWRIGHT_MCP = "@playwright/mcp@0.0.85";
const READY_MS = 60_000;

// The products the factory starts with a web address: the apps a persona
// can be sent into. None while the launcher cannot be read.
export function appsOf(launcher: () => Launcher): App[] {
  try {
    return webApps(launcher).map((part) => ({
      id: part.id,
      name: part.name,
      does: part.does,
    }));
  } catch {
    return [];
  }
}

const webApps = (launcher: () => Launcher) =>
  launcher()
    .state()
    .filter((part) => part.area === "products" && part.link);

// The address of the product (or the first with a web address), started
// when it is not running yet.
export async function appAddress(
  launcher: () => Launcher,
  product: string | null = null,
): Promise<string> {
  const apps = webApps(launcher);
  const app = product ? apps.find((part) => part.id === product) : apps[0];
  if (!app?.link)
    throw new TestProblem(
      product
        ? `Tests need the app “${product}”, and the factory has no app by that name.`
        : "Tests need an app the factory starts with a web address; there is none.",
    );
  if (app.light !== "running") {
    await launcher().start(app.id);
    const now = launcher()
      .state()
      .find((part) => part.id === app.id);
    if (now?.light !== "running") {
      const why = now?.problem ? `: ${now.problem.title}` : ".";
      throw new TestProblem(
        `Tests need ${app.name} running on this computer, and it did not start${why}`,
      );
    }
  }
  return app.link;
}

export async function playwrightBrowser(
  wish: BrowserWish = {},
): Promise<Browser> {
  const port = await freePort();
  const child = spawn(
    NPX,
    [
      "--yes",
      PLAYWRIGHT_MCP,
      "--headless",
      "--isolated",
      "--port",
      String(port),
      ...browserOptions(wish),
    ],
    { stdio: "ignore" },
  );
  const close = () => {
    child.kill();
  };
  const url = `http://localhost:${String(port)}/mcp`;
  const failed = new Promise<never>((_, reject) => {
    child.once("error", (error) => {
      reject(error);
    });
    child.once("exit", () => {
      reject(new Error("it stopped"));
    });
  });
  try {
    await Promise.race([answering(url), failed]);
  } catch (error) {
    close();
    throw new TestProblem(
      `Tests need a browser (Playwright's MCP server, via npx ${PLAYWRIGHT_MCP}) and it did not start: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
  return { url, close };
}

// The options for the wish: the screenshots' folder, and a configuration
// file (written in that folder) with the language and time zone.
export function browserOptions(wish: BrowserWish): string[] {
  if (!wish.shots) return [];
  const options = ["--output-dir", wish.shots];
  const context = {
    ...(wish.locale ? { locale: wish.locale } : {}),
    ...(wish.timeZone ? { timezoneId: wish.timeZone } : {}),
  };
  if (Object.keys(context).length === 0) return options;
  const config = join(wish.shots, "browser.json");
  writeFileSync(
    config,
    JSON.stringify({ browser: { contextOptions: context } }, null, 2),
  );
  return [...options, "--config", config];
}

async function answering(url: string): Promise<void> {
  const until = Date.now() + READY_MS;
  while (Date.now() < until) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(2_000) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("it did not answer within a minute");
}

// A port nobody uses now: the system picks one, and it is given back.
async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((done, fail) => {
    probe.once("error", fail).listen({ port: 0, host: "127.0.0.1" }, done);
  });
  const { port } = probe.address() as AddressInfo;
  await new Promise((done) => probe.close(done));
  return port;
}
