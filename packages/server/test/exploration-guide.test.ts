import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { guidesFolder } from "@software-factory/skills";

// What Doodle is told about its helper: the team knows it by its name tag on
// the prototype's card, and Doodle names it "my helper".

test("Doodle calls Tinker its helper when it names it to the team", () => {
  const guide = readFileSync(
    join(guidesFolder, "exploration-coach.md"),
    "utf8",
  );
  assert.match(guide, /\*\*Tinker\*\*, your helper kobold/);
  assert.match(guide, /"my helper"/);
  assert.match(guide, /never "the maker"/);
});
