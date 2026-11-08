import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { themeProblems } from "../src/theme-check.ts";

// The theme's check: the colours the dashboard's text sits on, for light
// and dark, plain and readable; the files it names there.

const LIGHT = `
  --background: #f8f9f7; --foreground: #151d2d;
  --card: #ffffff; --card-foreground: #151d2d;
  --primary: #3156d8; --primary-foreground: #ffffff;
  --muted-foreground: #627087; --border: #dce3ee;`;
const DARK = `
  --background: #101522; --foreground: #f4f7fd;
  --card: #182235; --card-foreground: #f4f7fd;
  --primary: #8ea9ff; --primary-foreground: #101522;
  --muted-foreground: #acbcd2; --border: #334159;`;

function project(theme: string | null): string {
  const folder = mkdtempSync(join(tmpdir(), "theme-"));
  mkdirSync(join(folder, "factory"));
  mkdirSync(join(folder, "fonts"));
  writeFileSync(join(folder, "fonts", "brand.woff2"), "font");
  if (theme !== null)
    writeFileSync(join(folder, "factory", "theme.css"), theme);
  return folder;
}

test("a complete, readable theme with its own font passes", () => {
  const theme = `@font-face { src: url("/api/theme/file?path=fonts/brand.woff2"); }
:root {${LIGHT} --font-body: "Brand"; }
@media (prefers-color-scheme: dark) { :root {${DARK}} }`;
  assert.deepEqual(themeProblems(project(theme)), []);
});

test("no theme is fine: the factory keeps its own look", () => {
  assert.deepEqual(themeProblems(project(null)), []);
});

test("the check names what is missing, unclear, hard to read or not there", () => {
  const theme = `@font-face { src: url("/api/theme/file?path=fonts/gone.woff2"); }
:root {${LIGHT.replace("--primary-foreground: #ffffff", "--primary-foreground: #5a6fd8")} --border: var(--line); }`;
  const problems = themeProblems(project(theme));
  assert.ok(
    problems.includes(
      'theme.css: --border (light) is "var(--line)", not a plain colour such as #3156d8.',
    ),
  );
  assert.ok(
    problems.some((p) =>
      /^theme\.css: --primary-foreground on --primary \(light\) is hard to read: \d\.\d:1, needs 4\.5:1\.$/.test(
        p,
      ),
    ),
  );
  assert.ok(
    problems.includes("theme.css sets no --background for the dark theme."),
  );
  assert.ok(
    problems.includes(
      "theme.css names /api/theme/file?path=fonts/gone.woff2, which is not a font or picture inside the project.",
    ),
  );
});

test("a theme that cannot be read says so", () => {
  assert.match(
    themeProblems(project(":root { --primary: #fff")).join(),
    /^theme\.css cannot be read: /,
  );
});
