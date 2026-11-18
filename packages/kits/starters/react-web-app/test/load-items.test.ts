import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { ApiError } from "../src/api/api-error.ts";
import { loadItems } from "../src/api/load-items.ts";
import { errorText } from "../src/lib/error-text.ts";
import { server } from "./pretend-server.ts";

// Every failure of a request is an ApiError with a code, and a person reads
// the code's text in the active language.

const load = () => loadItems({ signal: new AbortController().signal });

async function failure(): Promise<ApiError> {
  const error: unknown = await load().catch((caught: unknown) => caught);
  if (!(error instanceof ApiError)) throw new Error("expected an ApiError");
  return error;
}

test("the items come back checked", async () => {
  const items = await load();
  expect(items.map((item) => item.id)).toEqual(["item-1", "item-2", "item-3"]);
});

test("an answer of the wrong shape is invalid_response", async () => {
  server.use(http.get("*/api/items", () => HttpResponse.json({ items: [1] })));
  expect((await failure()).code).toBe("invalid_response");
});

test("no answer at all is network_unreachable", async () => {
  server.use(http.get("*/api/items", () => HttpResponse.error()));
  const error = await failure();
  expect(error.code).toBe("network_unreachable");
  expect(errorText(error)).toBe(
    "The service cannot be reached. Try again shortly.",
  );
});

test("a refusal keeps the backend's code, values and sentence", async () => {
  server.use(
    http.get("*/api/items", () =>
      HttpResponse.json(
        {
          error: "item_limit",
          message: "At most 3 items.",
          params: { max: 3 },
        },
        { status: 409 },
      ),
    ),
  );
  const error = await failure();
  expect(error).toMatchObject({ status: 409, code: "item_limit" });
  expect(error.params).toEqual({ max: 3 });
  // A code the app does not know yet shows the backend's sentence.
  expect(errorText(error)).toBe("At most 3 items.");
});

test("a refusal the app cannot read is service_unavailable", async () => {
  server.use(
    http.get("*/api/items", () => new HttpResponse("oops", { status: 500 })),
  );
  expect((await failure()).code).toBe("service_unavailable");
});

test("an error that is not an ApiError, or a code without sentence, reads as invalid data", () => {
  expect(errorText(new Error("boom"))).toBe(
    "The service sent incomplete data. Try again.",
  );
  expect(errorText(new ApiError({ status: 400, code: "unknown_code" }))).toBe(
    "The service sent incomplete data. Try again.",
  );
});

test("a request stopped on purpose is not turned into an error code", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    loadItems({ signal: controller.signal }),
  ).rejects.not.toBeInstanceOf(ApiError);
});
