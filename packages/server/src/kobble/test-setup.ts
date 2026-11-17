// What a persona test runs on: the product as the factory starts it on
// this computer (the launcher, with the kit's command and port), and a
// browser for the persona agent: Playwright's MCP server, the browser
// Claude Code's own Playwright integration uses, started headless and
// without a saved profile, over HTTP on a free port.

import { spawn } from "node:child_process";
import { createServer } from "node:net";

import type { Launcher } from "@software-factory/launcher";

import { type Browser, TestProblem } from "./persona-tests.ts";
import { NPX } from "./programs.ts";

// The version used; npx keeps it once fetched.
const PLAYWRIGHT_MCP = "@playwright/mcp@0.0.85";
const READY_MS = 60_000;

// The address of the product with a web address, started when it is not
// running yet.
export async function appAddress(launcher: () => Launcher): Promise<string> {
  const parts = launcher().state();
  const app = parts.find((part) => part.area === "products" && part.link);
  if (!app?.link)
    throw new TestProblem(
      "Persona tests need a product the factory starts with a web address; there is none.",
    );
  if (app.light !== "running") {
    await launcher().start(app.id);
    const now = launcher()
      .state()
      .find((part) => part.id === app.id);
    if (now?.light !== "running") {
      const why = now?.problem ? `: ${now.problem.title}` : ".";
      throw new TestProblem(
        `Persona tests need ${app.name} running on this computer, and it did not start${why}`,
      );
    }
  }
  return app.link;
}

export async function playwrightBrowser(): Promise<Browser> {
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
      `Persona tests need a browser (Playwright's MCP server, via npx ${PLAYWRIGHT_MCP}) and it did not start: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
  return { url, close };
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

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => {
        resolve(port);
      });
    });
  });
}
