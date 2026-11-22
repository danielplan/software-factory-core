import { expect, test, type Page } from "@playwright/test";

// The built prototype (npm run prototype): MSW's service worker answers /api
// from the situation in ?situation=, and the page tells the frame around it
// which situations it has. Nothing is routed here: every answer comes from
// the worker.

type Announcement = {
  type: string;
  app: string;
  situations: { key: string; name: string }[];
  current: string;
  world: boolean;
};

// Opens the prototype and returns what it posted to the page around it (the
// page itself when there is no frame).
async function open(page: Page, address: string): Promise<Announcement> {
  await page.addInitScript(() => {
    window.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (event.origin === window.location.origin)
        Reflect.set(window, "announcement", event.data);
    });
  });
  await page.goto(address);
  await expect(
    page.getByRole("heading", { level: 1, name: "New web app" }),
  ).toBeVisible();
  await page.waitForFunction(() => Reflect.has(window, "announcement"));
  return page.evaluate(
    () => Reflect.get(window, "announcement") as Announcement,
  );
}

test("the first situation opens by default and is announced", async ({
  page,
}) => {
  const announcement = await open(page, "./");
  expect(announcement).toMatchObject({
    type: "factory-prototype",
    app: "new-web-app",
    current: "normal",
    world: false,
  });
  expect(announcement.situations.map((s) => s.key)).toEqual([
    "normal",
    "empty",
  ]);
  await expect(page.getByRole("heading", { name: "3 items" })).toBeVisible();
});

test("a situation is picked in the address", async ({ page }) => {
  const announcement = await open(page, "./?situation=empty");
  expect(announcement.current).toBe("empty");
  await expect(page.getByText("No items yet")).toBeVisible();
});
