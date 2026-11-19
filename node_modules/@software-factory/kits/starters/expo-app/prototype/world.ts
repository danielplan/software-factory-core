// The link to a shared made-up world that the factory may give the
// prototype (FACTORY_WORLD_URL when the prototype starts; README.md, "Shared
// world"). Several devices open the same world: each reads its tables,
// writes its changes and looks again every two seconds, so a change made on
// one shows on the others.
//
//   GET  <url> → { situation, version, signed_in, tables }
//   POST <url>   { version, changes: [{ table, op, row }] }
//                → 409 when the version is stale: read again and retry.

/** One row of a table, as the world holds it. */
export type Row = Record<string, unknown>;

export type World = {
  situation: string;
  version: string | number;
  signed_in: Record<string, string>;
  tables: Record<string, Row[]>;
};

export type Change = {
  table: string;
  op: 'add' | 'change' | 'remove';
  row: Row;
};

type Fetch = typeof fetch;

/** How many times a write is tried when others keep changing the world. */
const tries = 3;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function isWorld(value: unknown): value is World {
  if (!isObject(value)) return false;
  return (
    typeof value.situation === 'string' &&
    (typeof value.version === 'string' || typeof value.version === 'number') &&
    isObject(value.tables) &&
    isObject(value.signed_in)
  );
}

export function worldLink(url: string, fetchFn: Fetch = fetch) {
  let version: World['version'] | undefined;

  async function read(): Promise<World> {
    const response = await fetchFn(url, { cache: 'no-store' });
    if (!response.ok)
      throw new Error(`The shared world answered ${response.status}.`);
    const body: unknown = await response.json();
    if (!isWorld(body)) throw new Error('The shared world is not readable.');
    version = body.version;
    return body;
  }

  async function write(changes: Change[]): Promise<void> {
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (version === undefined) await read();
      const response = await fetchFn(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version, changes }),
      });
      if (response.ok) return;
      if (response.status !== 409)
        throw new Error(
          `The shared world refused the change (${response.status}).`,
        );
      // Someone else changed the world first: read it again and retry.
      version = undefined;
    }
    throw new Error(
      'The shared world kept changing; the change was not saved.',
    );
  }

  /** Calls `onChange` with the world each time its version changes. */
  function follow(onChange: (world: World) => void, everyMs = 2000) {
    let seen = version;
    let busy = false;
    const look = async () => {
      if (busy) return;
      busy = true;
      try {
        const world = await read();
        if (world.version !== seen) {
          seen = world.version;
          onChange(world);
        }
      } catch {
        // The world may be away for a moment; the next look tries again.
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(() => void look(), everyMs);
    return () => {
      clearInterval(timer);
    };
  }

  return { read, write, follow };
}
