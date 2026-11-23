import { expect, serve, test } from "./pretend.ts";

// The home page in a real browser, on the real build: the items the backend
// lists, an empty list said plainly, and a failed load that can be tried
// again. Each new journey of the app gets its click-through here.

test("the home page lists the items", async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { level: 1, name: "New web app" }),
  ).toBeVisible();
  const list = page.getByRole("region", { name: "Items" });
  await expect(list.getByRole("heading", { name: "3 items" })).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(3);
});

test("with no items the page says so", async ({ page }) => {
  await serve(page, { items: [] });
  await page.goto("./");
  await expect(page.getByText("No items yet")).toBeVisible();
  await expect(page.getByRole("region", { name: "Items" })).toHaveCount(0);
});

test("a failed load says why, and trying again loads the items", async ({
  page,
}) => {
  // The app asks twice before it gives up; the third time is the button's.
  let refused = 0;
  await page.route("**/api/items", async (route) => {
    if (refused === 2) {
      await route.fallback();
      return;
    }
    refused += 1;
    await route.fulfill({ status: 500, body: "down" });
  });
  await page.goto("./");
  await expect(
    page.getByText("The service is not answering as expected."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "3 items" })).toBeVisible();
});

test("an address of its own opens the app, not the server's error", async ({
  page,
}) => {
  await page.goto("./somewhere/else");
  await expect(
    page.getByRole("heading", { level: 1, name: "New web app" }),
  ).toBeVisible();
});
