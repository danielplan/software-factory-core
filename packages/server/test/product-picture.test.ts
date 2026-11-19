import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  codeMaps,
  productPicture,
} from "../src/kobble/explorations/product-picture.ts";
import { lastWords } from "../src/kobble/explorations/making-words.ts";

function project() {
  const folder = mkdtempSync(join(tmpdir(), "picture-"));
  const write = (path: string, text: string) => {
    mkdirSync(join(folder, path, ".."), { recursive: true });
    writeFileSync(join(folder, path), text);
  };
  write(
    "factory/factory.json",
    JSON.stringify({
      name: "Co",
      about: "A test.",
      tracker: "none",
      kits: [],
      extensions: [],
      products: ["web"],
    }),
  );
  write(
    "web/product.json",
    JSON.stringify({
      id: "web",
      name: "Shop",
      kind: "web-app",
      about: "Where customers order.",
      users: [{ who: "Customers", does: "order and pay" }],
    }),
  );
  write("web/src/routes/orders/+page.svelte", "<p>Orders</p>");
  write("web/src/lib/components/table.svelte", "<table></table>");
  write("web/node_modules/x/routes/skip.ts", "");
  write("docs/journeys/ordering.md", "Intro\n# Ordering a basket\n");
  write("docs/notes.md", "no heading");
  return folder;
}

test("the kobold's picture of the product: products, their people, the pages kept", () => {
  const folder = project();
  const picture = productPicture(join(folder, "factory"), folder);
  assert.match(picture, /\*\*Shop\*\* \(web\): Where customers order\./);
  assert.match(picture, /Customers: order and pay/);
  assert.match(picture, /docs\/journeys\/ordering\.md: Ordering a basket/);
  assert.match(picture, /- docs\/notes\.md$/m);
});

test("the maker's map: screens and shared pieces, never installed packages", () => {
  const map = codeMaps(join(project(), "factory"));
  assert.match(map, /## A map of Shop/);
  assert.match(map, /src\/routes\/orders\/\+page\.svelte/);
  assert.match(map, /src\/lib\/components\/table\.svelte/);
  assert.doesNotMatch(map, /node_modules/);
});

test("no products: the picture says so", () => {
  const folder = mkdtempSync(join(tmpdir(), "picture-"));
  assert.match(productPicture(folder, folder), /No product is described yet/);
});

test("the maker's last words: its last paragraph", () => {
  assert.equal(
    lastWords("Working on it.\n\nChanged the list.\nAdded recharts."),
    "Changed the list.\nAdded recharts.",
  );
});
