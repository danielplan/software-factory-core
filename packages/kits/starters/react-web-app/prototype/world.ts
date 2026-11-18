// The shared made-up world, when the factory gives one: several devices
// (or apps) look at the same made-up data and see each other's changes.
// The factory names it with FACTORY_WORLD_URL when the prototype starts:
// GET <url> answers the whole world, POST <url> changes it, and a stale
// version is refused with 409, so the change is tried again on the latest
// world. Without that setting the prototype keeps to its own situations.

export type Row = Record<string, unknown>;

export type World = {
  situation: string;
  version: string | number;
  signed_in: Record<string, string>;
  tables: Record<string, Row[]>;
};

export type Change = {
  table: string;
  op: "add" | "change" | "remove";
  row: Row;
};

export type WorldLink = {
  read: () => Promise<World>;
  write: (changes: Change[]) => Promise<void>;
  follow: (onChange: (world: World) => void, everyMs?: number) => () => void;
};

// How often a change is tried again on a newer world before giving up.
const TRIES = 3;

function isWorld(value: unknown): value is World {
  if (typeof value !== "object" || value === null) return false;
  const { tables, version } = value as Record<string, unknown>;
  return (
    typeof tables === "object" &&
    tables !== null &&
    (typeof version === "string" || typeof version === "number")
  );
}

export function worldLink(url: string, fetchFn = fetch): WorldLink {
  let last: World | undefined;

  async function read(): Promise<World> {
    const response = await fetchFn(url, { cache: "no-store" });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok || !isWorld(body))
      throw new Error(`The shared world at ${url} did not answer.`);
    last = body;
    return body;
  }

  async function write(changes: Change[]): Promise<void> {
    for (let attempt = 0; attempt < TRIES; attempt += 1) {
      const version = (last ?? (await read())).version;
      const response = await fetchFn(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version, changes }),
      });
      if (response.ok) {
        await read();
        return;
      }
      if (response.status !== 409)
        throw new Error(`The shared world refused the change.`);
      await read();
    }
    throw new Error("The shared world kept changing; the change was not made.");
  }

  // Reads the world every `everyMs` and calls onChange when its version is
  // new. A failed read is skipped: the next one tries again.
  function follow(onChange: (world: World) => void, everyMs = 2000) {
    let seen = last?.version;
    const timer = setInterval(() => {
      read()
        .then((world) => {
          if (world.version === seen) return;
          seen = world.version;
          onChange(world);
        })
        .catch(() => undefined);
    }, everyMs);
    return () => {
      clearInterval(timer);
    };
  }

  return { read, write, follow };
}
