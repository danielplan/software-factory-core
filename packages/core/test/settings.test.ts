import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  changeEnvText,
  checkChanges,
  checkGroups,
  groupView,
  saveGroup,
  type SettingGroup,
} from "../src/index.ts";
import { runner } from "./stand-ins.ts";

const github = runner.settings[0]!;

test("a changed value keeps the file's comments and other lines", () => {
  const before = "# The board\nFACTORY_PROJECT=1\nFACTORY_PORT=4180\n";
  assert.equal(
    changeEnvText(before, { FACTORY_PROJECT: "2", FACTORY_MODEL: "" }),
    "# The board\nFACTORY_PROJECT=2\nFACTORY_PORT=4180\nFACTORY_MODEL=\n",
  );
  assert.equal(changeEnvText("A=1\r\nB=2\r\nA=3\r\n", { A: null }), "B=2\r\n");
  assert.equal(changeEnvText("", { A: null }), "");
  assert.equal(
    changeEnvText("# FACTORY_PROJECT=1\n", { FACTORY_PROJECT: "4" }),
    "# FACTORY_PROJECT=1\nFACTORY_PROJECT=4\n",
  );
});

test("values that do not fit their field are refused in plain words", () => {
  const { changes, refused } = checkChanges(github, {
    FACTORY_REPOSITORY: "no slash",
    FACTORY_PROJECT: "0",
    FACTORY_MODEL: "",
    FACTORY_PORT: "1",
  });
  assert.deepEqual(changes, { FACTORY_MODEL: "" });
  assert.match(refused.FACTORY_PROJECT ?? "", /from 1 to 9999/);
  assert.match(refused.FACTORY_REPOSITORY ?? "", /no spaces/);
  assert.equal(refused.FACTORY_PORT, "Not a setting here.");
  const more = checkChanges(github, {
    FACTORY_REPOSITORY: "noslash",
    FACTORY_MODEL: "gpt",
    FACTORY_PROJECT: "",
  });
  assert.deepEqual(more.changes, { FACTORY_PROJECT: null });
  assert.match(more.refused.FACTORY_REPOSITORY ?? "", /does not look right/);
  assert.equal(more.refused.FACTORY_MODEL, "Pick one of the choices.");
  assert.equal(
    checkChanges(github, { FACTORY_PROJECT: 7 }).refused.FACTORY_PROJECT,
    "Write it as text.",
  );
  assert.deepEqual(checkChanges(github, { FACTORY_REPOSITORY: null }).changes, {
    FACTORY_REPOSITORY: null,
  });
});

test("a group is read from its file and saved there, its folder made if needed", () => {
  const root = mkdtempSync(join(tmpdir(), "settings-"));
  mkdirSync(join(root, ".factory"));
  writeFileSync(join(root, ".factory", ".env"), "# mine\nFACTORY_PROJECT=3\n");
  const view = groupView(github, root);
  assert.equal(
    view.fields.find((f) => f.key === "FACTORY_PROJECT")?.value,
    "3",
  );
  assert.equal(view.fields.find((f) => f.key === "FACTORY_MODEL")?.value, null);
  saveGroup(github, root, {
    FACTORY_PROJECT: null,
    FACTORY_REPOSITORY: "someone/else",
  });
  assert.equal(
    readFileSync(join(root, ".factory", ".env"), "utf8"),
    "# mine\nFACTORY_REPOSITORY=someone/else\n",
  );
  const empty = mkdtempSync(join(tmpdir(), "settings-"));
  saveGroup(github, empty, { FACTORY_MODEL: "sonnet" });
  assert.equal(groupView(github, empty).fields[2]?.value, "sonnet");
});

test("a broken settings list is reported", () => {
  const field = { label: "A", help: "A.", kind: "text" as const };
  const broken: SettingGroup[] = [
    {
      id: "x",
      name: "X",
      about: "X.",
      file: "x/.env",
      usedBy: ["nobody"],
      fields: [
        { ...field, key: "A", kind: "choice" },
        { ...field, key: "A" },
      ],
    },
    {
      id: "x",
      name: "X",
      about: "X.",
      file: "x/.env",
      usedBy: [],
      fields: [{ ...field, key: "B" }],
    },
  ];
  assert.deepEqual(checkGroups(broken, ["runner"]), [
    'settings "x" are used by "nobody", which is not a part',
    'the setting "A" is listed twice',
    '"x" has nothing to choose for "A"',
    'the setting "A" is listed twice',
    'the settings "x" are listed twice',
  ]);
});
