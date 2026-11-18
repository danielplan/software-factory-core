import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import "../src/i18n/i18n.ts";
import { server, usePretendBackend } from "./pretend-server.ts";

// A page loads on demand; with coverage on a busy computer the first load can
// take longer than Testing Library's default second.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
// Each test starts on a fresh normal day.
beforeEach(() => {
  usePretendBackend();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});
