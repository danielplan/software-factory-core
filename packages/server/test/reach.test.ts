import assert from "node:assert/strict";
import { mkdtempSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { admit, lanKey, type Reach } from "../src/app/reach.ts";

// Who may reach the factory: this computer by its own name; with --lan, the
// owner's other devices (an iPad) once they opened the printed address.

const KEY = "the-key-of-this-computer";
const lan: Reach = { lan: true, key: KEY };
// An iPad on the local network (an address kept for examples).
const DEVICE = "192.0.2.30";

type Seen = { status: number; headers: Record<string, string> };

function ask(
  from: string,
  host: string,
  path: string,
  reach: Reach,
  cookie?: string,
): { in: boolean; seen: Seen } {
  const incoming = {
    headers: { host, ...(cookie ? { cookie } : {}) },
    socket: { remoteAddress: from },
  } as unknown as IncomingMessage;
  const seen: Seen = { status: 0, headers: {} };
  const response = {
    writeHead: (status: number, headers: Record<string, string> = {}) => {
      seen.status = status;
      seen.headers = headers;
    },
    end: () => {},
  } as unknown as ServerResponse;
  const url = new URL(path, "http://localhost");
  return { in: admit(incoming, response, url, reach), seen };
}

test("this computer, by its own name, is let in; by another name not", () => {
  assert.equal(ask("127.0.0.1", "localhost:4300", "/", lan).in, true);
  assert.equal(ask("::1", "[::1]:4300", "/", lan).in, true);
  const other = ask("127.0.0.1", "evil.example:4300", "/", lan);
  assert.deepEqual([other.in, other.seen.status], [false, 403]);
});

test("another device is turned away without --lan, even with the key", () => {
  const asked = ask(DEVICE, "192.0.2.20:4300", `/?key=${KEY}`, {
    lan: false,
    key: KEY,
  });
  assert.deepEqual([asked.in, asked.seen.status], [false, 403]);
});

test("with --lan, a device is let in by the key and keeps it", () => {
  const without = ask(DEVICE, "192.0.2.20:4300", "/", lan);
  assert.deepEqual([without.in, without.seen.status], [false, 403]);
  const wrong = ask(DEVICE, "192.0.2.20:4300", "/?key=nope", lan);
  assert.deepEqual([wrong.in, wrong.seen.status], [false, 403]);

  const opened = ask(DEVICE, "192.0.2.20:4300", `/?key=${KEY}#/explore`, lan);
  assert.equal(opened.in, false);
  assert.equal(opened.seen.status, 302);
  assert.equal(opened.seen.headers.location, "/");
  assert.match(opened.seen.headers["set-cookie"] ?? "", /HttpOnly/);

  const later = ask(
    DEVICE,
    "192.0.2.20:4300",
    "/api/state",
    lan,
    `other=1; kobble-key=${KEY}`,
  );
  assert.equal(later.in, true);
});

test("the key stays the same from start to start, readable only by the owner", () => {
  const home = mkdtempSync(join(tmpdir(), "reach-"));
  const key = lanKey(home);
  assert.ok(key.length >= 20);
  assert.equal(lanKey(home), key);
  assert.equal(statSync(join(home, ".kobble", "lan-key")).mode & 0o077, 0);
});
