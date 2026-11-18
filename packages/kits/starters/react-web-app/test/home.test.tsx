import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { renderApp } from "./render-app.tsx";
import { server, usePretendBackend } from "./pretend-server.ts";

// The home page: what the app is, the items the backend lists, an empty list
// said plainly, and a failed load that is never shown as an empty list.

test("the home page says what the app is and lists the items", async () => {
  renderApp("/");
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "New web app",
    }),
  ).toBeVisible();
  expect(screen.getByText(/starting point/)).toBeVisible();
  const list = await screen.findByRole("region", { name: "Items" });
  expect(within(list).getByRole("heading", { name: "3 items" })).toBeVisible();
  expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  expect(within(list).getByText("First item")).toBeVisible();
  expect(within(list).getAllByText(/^Updated on /)).toHaveLength(3);
});

test("one item is counted in the singular", async () => {
  usePretendBackend({
    items: [
      {
        id: "only",
        name: "Only item",
        note: "",
        updated_at: "2026-10-01T09:00:00Z",
      },
    ],
  });
  renderApp("/");
  expect(await screen.findByRole("heading", { name: "1 item" })).toBeVisible();
});

test("with no items the page says so, with no list", async () => {
  usePretendBackend({ items: [] });
  renderApp("/");
  expect(await screen.findByText("No items yet")).toBeVisible();
  expect(screen.queryByRole("region", { name: "Items" })).toBeNull();
});

test("an unknown address opens the home page", async () => {
  renderApp("/somewhere/else");
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "New web app",
    }),
  ).toBeVisible();
});

test("a refusal shows its code's text and the page can try again", async () => {
  server.use(
    http.get(
      "*/api/items",
      () =>
        HttpResponse.json(
          { error: "service_unavailable", message: "Down." },
          { status: 503 },
        ),
      { once: true },
    ),
    http.get(
      "*/api/items",
      () =>
        HttpResponse.json(
          { error: "service_unavailable", message: "Down." },
          { status: 503 },
        ),
      { once: true },
    ),
  );
  const { user } = renderApp("/");
  expect(await screen.findByText("The data could not be loaded")).toBeVisible();
  expect(
    screen.getByText(
      "The service is not answering as expected. Try again shortly.",
    ),
  ).toBeVisible();
  expect(screen.queryByText("No items yet")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("First item")).toBeVisible();
});
