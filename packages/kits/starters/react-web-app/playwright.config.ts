import { defineConfig, devices } from "@playwright/test";

// Click-throughs in a real browser (npm run test:e2e builds both first): the
// real build, served by Vite's preview server, with every /api request
// answered by the pretend backend inside the browser (e2e/pretend.ts), and
// the built prototype on a second port, answered by MSW's service worker. No
// backend or database is needed. E2E_PORT moves both ports, so working copies
// can run them side by side.
const port = Number(process.env.E2E_PORT ?? "4173");
const app = `http://127.0.0.1:${port}/`;
const prototype = `http://127.0.0.1:${port + 1}/`;
const preview = "npx vite preview --configLoader native --host 127.0.0.1";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: true,
  timeout: 30_000,
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "app",
      use: { ...devices["Desktop Chrome"], baseURL: app },
      testIgnore: /prototype\.spec\.ts/,
    },
    {
      name: "prototype",
      use: { ...devices["Desktop Chrome"], baseURL: prototype },
      testMatch: /prototype\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: `${preview} --port ${port} --strictPort`,
      url: app,
      reuseExistingServer: false,
    },
    {
      command: `${preview} --outDir dist-prototype --port ${port + 1} --strictPort`,
      url: prototype,
      reuseExistingServer: false,
    },
  ],
});
