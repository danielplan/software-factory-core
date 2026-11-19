import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { itemsSchema } from "../src/api/items.schema.ts";
import { situations } from "../prototype/situations.ts";
import { renderApp } from "./render-app.tsx";
import { usePretendBackend } from "./pretend-server.ts";

// Every situation of the prototype (prototype/situations.ts) is an answer
// the app accepts and opens the home page without the error screen, through
// the same pretend backend the other tests use. Starting the prototype tells
// the page around it the situations.

vi.mock("msw/browser", () => ({
  setupWorker: () => ({ start: () => Promise.resolve(undefined) }),
}));

test("situations have distinct keys and names, a normal day first", () => {
  expect(situations.map((item) => item.key).slice(0, 2)).toEqual([
    "normal",
    "empty",
  ]);
  expect(new Set(situations.map((item) => item.key)).size).toBe(
    situations.length,
  );
  expect(new Set(situations.map((item) => item.name)).size).toBe(
    situations.length,
  );
});

describe.each(situations)("situation $key", (situation) => {
  test("its data is an answer the app accepts", () => {
    expect(itemsSchema.safeParse(situation.data()).success).toBe(true);
  });

  test("the home page opens without the error screen", async () => {
    usePretendBackend(situation.data());
    renderApp("/");
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "New web app",
      }),
    ).toBeVisible();
    const count = situation.data().items.length;
    expect(
      await screen.findByText(count > 0 ? `${count} items` : "No items yet"),
    ).toBeVisible();
    expect(screen.queryByText("The data could not be loaded")).toBeNull();
  });
});

test("the prototype tells the page around it its situations", async () => {
  window.history.replaceState(null, "", "/?situation=empty");
  const sent = vi.spyOn(window.parent, "postMessage");
  const { startPrototype } = await import("../prototype/start.ts");
  await startPrototype();
  expect(sent).toHaveBeenCalledWith(
    {
      type: "factory-prototype",
      app: "new-web-app",
      situations: [
        { key: "normal", name: "A normal day" },
        { key: "empty", name: "Empty" },
      ],
      current: "empty",
      world: false,
    },
    "*",
  );
});
