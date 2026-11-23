// Who may reach the factory. Always this computer, by its own name (so
// another web page cannot, through a name of its own). Unless started with
// `--local`, also the owner's other devices on the local network (an iPad):
// each once it opened the address the factory printed or showed as a QR code,
// whose key it then keeps as a cookie. A
// device without the key gets nothing, since the factory runs agents with
// this computer's rights.

import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { homedir, networkInterfaces } from "node:os";
import { join } from "node:path";

import { encode } from "uqr";

import { type Route, send } from "../http.ts";

export type Reach = {
  // Whether other devices on the local network may reach it too.
  lan: boolean;
  // What they show to be let in.
  key: string;
};

export const THIS_COMPUTER: Reach = { lan: false, key: "" };

const HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const LOOPBACK = new Set(["127.0.0.1", "::1"]);
const COOKIE = "kobble-key";
const YEAR = 60 * 60 * 24 * 365;

// Whether the request may go on; when not, it has been answered (turned
// away, or let in with its key kept and sent on without it).
export function admit(
  incoming: IncomingMessage,
  response: ServerResponse,
  url: URL,
  reach: Reach,
): boolean {
  const host = (incoming.headers.host ?? "").replace(/:\d+$/, "");
  const from = (incoming.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
  const near = LOOPBACK.has(from);
  if (near && HOSTS.has(host)) return true;
  if (!reach.lan || near) {
    send(response, 403, { error: "Not here." });
    return false;
  }
  const given = url.searchParams.get("key");
  if (given !== null && same(given, reach.key)) {
    url.searchParams.delete("key");
    response.writeHead(302, {
      location: `${url.pathname}${url.search}`,
      "set-cookie": `${COOKIE}=${reach.key}; Path=/; Max-Age=${String(YEAR)}; HttpOnly; SameSite=Strict`,
    });
    response.end();
    return false;
  }
  if (same(cookieOf(incoming) ?? "", reach.key)) return true;
  send(response, 403, {
    error: "Open the address the factory printed when it started.",
  });
  return false;
}

function cookieOf(incoming: IncomingMessage): string | null {
  for (const part of (incoming.headers.cookie ?? "").split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === COOKIE && value) return value;
  }
  return null;
}

function same(given: string, key: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(key);
  return key.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

// This computer's key for its devices, the same every start (so a device
// stays let in): made once, kept in the owner's home folder.
export function lanKey(home = homedir()): string {
  const folder = join(home, ".kobble");
  const file = join(folder, "lan-key");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  mkdirSync(folder, { recursive: true });
  const key = randomBytes(18).toString("base64url");
  writeFileSync(file, key, { mode: 0o600 });
  return key;
}

// The address another device opens once, with the key: on this computer's
// first address on the local network. None without --lan or a network.
export function deviceAddress(reach: Reach, port: number): string | null {
  const lan = Object.values(networkInterfaces())
    .flat()
    .find((one) => one && one.family === "IPv4" && !one.internal);
  if (!reach.lan || !lan) return null;
  return `http://${lan.address}:${String(port)}/?key=${reach.key}`;
}

// Where the owner's other devices open it, as the sidebar shows it: the
// address and its QR code (none without a network or with --local).
export function lanRoutes(reach: Reach, port: number): Record<string, Route> {
  return {
    "GET /api/lan": () => {
      const address = deviceAddress(reach, port);
      return { address, qr: address ? qrOf(address) : null };
    },
  };
}

// The address as a QR code, for the device's camera: its side, in squares,
// and the dark squares as an SVG path.
export function qrOf(text: string): { size: number; path: string } {
  const { data, size } = encode(text, { border: 2 });
  const path = data
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${String(x)} ${String(y)}h1v1h-1z` : "")),
    )
    .join("");
  return { size, path };
}
