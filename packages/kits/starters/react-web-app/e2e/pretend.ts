import { test as base, type Page } from "@playwright/test";
import {
  pretendBackend,
  type PretendBackend,
} from "../prototype/pretend-backend.ts";
import type { Data } from "../prototype/situations.ts";

// The browser's /api requests answered by the app's one pretend backend
// (prototype/pretend-backend.ts), the same the component tests and the
// prototype use. A request it does not know is refused as the real backend
// would. A later page.route wins over this one, for one-off answers.
export async function serve(page: Page, data?: Data): Promise<PretendBackend> {
  const backend = pretendBackend(data);
  await page.unroute("**/api/**");
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const answer = await backend.answer(
      request.method(),
      new URL(request.url()).pathname,
      request.postDataJSON() as unknown,
    );
    await route.fulfill(
      answer
        ? { status: answer.status, json: answer.body }
        : { status: 404, json: { error: "not_found", message: "Not found." } },
    );
  });
  return backend;
}

// Every click-through starts on a fresh normal day.
export const test = base.extend<{ backend: PretendBackend }>({
  backend: [
    async ({ page }, use) => {
      await use(await serve(page));
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
