import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkNumber,
  FIRST_NUMBER,
  lastNumber,
  nextNumber,
  numberOfTag,
} from "../src/extensions/releases/numbers.ts";
import {
  bodyOf,
  listedNotes,
  type Merged,
} from "../src/extensions/releases/notes.ts";

test("with nothing to act on the last number goes up, new things included", () => {
  assert.equal(nextNumber("1.4.2", false), "1.4.3");
});

test("with something to act on the middle number goes up and the last starts again", () => {
  assert.equal(nextNumber("1.4.3", true), "1.5.0");
});

test("the first release gets the starting number, whatever the kobold says", () => {
  assert.equal(nextNumber(null, false), FIRST_NUMBER);
  assert.equal(nextNumber(null, true), FIRST_NUMBER);
});

test("the highest vX.Y.Z tag is the last; other tags are ignored", () => {
  assert.equal(
    lastNumber(["v1.4.2", "v1.10.0", "v1.9.9", "release-2.0.0", "v2", "v1.4"]),
    "1.10.0",
  );
  assert.equal(lastNumber(["release-1.0.0"]), null);
  assert.equal(lastNumber([]), null);
  assert.equal(numberOfTag("v0.1.0"), "0.1.0");
  assert.equal(numberOfTag("v0.1.0-rc1"), null);
});

test("a number the team types must be x.y.z, higher than the last, and new", () => {
  assert.equal(checkNumber(" 1.5.0 ", "1.4.3", ["v1.4.3"]), "1.5.0");
  assert.equal(checkNumber("0.0.1", null, []), "0.0.1");
  assert.throws(() => checkNumber("1.5", "1.4.3", []), /not a release number/);
  assert.throws(() => checkNumber("v1.5.0", "1.4.3", []), /not a release/);
  assert.throws(() => checkNumber("1.4.3", "1.4.3", []), /not higher/);
  assert.throws(() => checkNumber("1.3.9", "1.4.3", []), /not higher/);
  assert.throws(
    () => checkNumber("1.4.4", "1.4.3", ["v1.4.4"]),
    /release 1.4.4 already/,
  );
});

const merged = (
  number: number,
  title: string,
  type: Merged["type"],
): Merged => ({
  number,
  title,
  type,
  body: "",
  url: `https://github.com/acme/shop/pull/${String(number)}`,
});

test("without the kobold's draft, each pull request is a change of its card's type, not of its title", () => {
  const all = [
    merged(1, "Fix the header", "feature"),
    merged(3, "Crash on empty cart", "bug"),
    merged(4, "Faster search", "improvement"),
    merged(5, "Tidy the readme", null),
  ];
  assert.equal(
    bodyOf(listedNotes(all), all),
    [
      "- New: **Fix the header**",
      "- Fixed: **Crash on empty cart**",
      "- Changed: **Faster search**",
      "- Changed: **Tidy the readme**",
      "",
      "Pull requests: [#1](https://github.com/acme/shop/pull/1), [#3](https://github.com/acme/shop/pull/3), [#4](https://github.com/acme/shop/pull/4), [#5](https://github.com/acme/shop/pull/5)",
      "",
    ].join("\n"),
  );
  assert.equal(bodyOf({ en: [] }, []), "\n");
});
