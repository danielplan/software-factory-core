import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { stage } from "./stage.ts";

// A company's look: factory/theme.css, given to the dashboard as /theme.css,
// and only the project's files it names (its fonts, its logo).

test("the dashboard gets the company's theme and only the files it names", async () => {
  const { server, base, project } = await stage();
  try {
    const empty = await fetch(`${base}/theme.css`);
    assert.equal(empty.status, 200);
    assert.match(empty.headers.get("content-type") ?? "", /^text\/css/);
    assert.equal(await empty.text(), "");

    mkdirSync(join(project, "fonts"));
    writeFileSync(join(project, "fonts", "brand.woff2"), "font");
    writeFileSync(join(project, "fonts", "other.woff2"), "other");
    writeFileSync(join(project, "notes.txt"), "secret");
    mkdirSync(join(project, "factory"));
    const theme = [
      '@font-face { src: url("/api/theme/file?path=fonts/brand.woff2"); }',
      '/* url("/api/theme/file?path=notes.txt") */',
      '/* url("/api/theme/file?path=../outside.woff2") */',
      ":root { --primary: #3156d8; }",
    ].join("\n");
    writeFileSync(join(project, "factory", "theme.css"), theme);
    assert.equal(await (await fetch(`${base}/theme.css`)).text(), theme);

    const file = (path: string) =>
      fetch(`${base}/api/theme/file?path=${encodeURIComponent(path)}`);
    const font = await file("fonts/brand.woff2");
    assert.equal(font.status, 200);
    assert.equal(font.headers.get("content-type"), "font/woff2");
    assert.equal(await font.text(), "font");
    // Not named by the theme, not a font or picture, or outside the project.
    assert.equal((await file("fonts/other.woff2")).status, 404);
    assert.equal((await file("notes.txt")).status, 404);
    assert.equal((await file("../outside.woff2")).status, 404);
    assert.equal((await fetch(`${base}/api/theme/file`)).status, 404);
  } finally {
    server.close();
  }
});
