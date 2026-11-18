import { setupServer } from "msw/node";
import {
  pretendBackend,
  type PretendBackend,
} from "../prototype/pretend-backend.ts";
import { pretendHandler } from "../prototype/pretend-handler.ts";
import type { Data } from "../prototype/situations.ts";

// The MSW server behind every component test. Each test calls
// usePretendBackend for a fresh copy of the data; server.use adds one-off
// answers.
let backend: PretendBackend = pretendBackend();

export function usePretendBackend(data?: Data): PretendBackend {
  backend = pretendBackend(data);
  return backend;
}

export const server = setupServer(pretendHandler("*/api/*", () => backend));
