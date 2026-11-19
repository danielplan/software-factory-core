import { http, HttpResponse } from "msw";
import type { PretendBackend } from "./pretend-backend.ts";

// One MSW handler that sends every /api request to the pretend backend: the
// component tests use it in Node, the prototype in the browser's service
// worker. `backend` is read on each request, so a test can start a fresh one.
// A request the pretend backend does not know is refused as the real backend
// would.
export function pretendHandler(path: string, backend: () => PretendBackend) {
  return http.all(path, async ({ request }) => {
    const { pathname } = new URL(request.url);
    const body: unknown =
      request.method === "GET"
        ? undefined
        : await request.json().catch(() => undefined);
    const answer = await backend().answer(request.method, pathname, body);
    return answer
      ? HttpResponse.json(answer.body, { status: answer.status })
      : HttpResponse.json(
          { error: "not_found", message: "Not found." },
          { status: 404 },
        );
  });
}
