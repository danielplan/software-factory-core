// The one pretend backend of the app, used by the component tests (through
// MSW in Node) and the prototype (through MSW's service worker), so both see
// the same behaviour. It starts from a situation's data
// (prototype/situations.ts), or from the factory's shared world when there
// is one (prototype/shared-world.ts), and then writes its changes there too.
// A new request of the app gets its answer here, the way the real backend
// will answer it, refusals included.

import { normalDay, type Data } from "./situations.ts";
import type { Change } from "./world.ts";

type Answer = { status: number; body: object };

export type PretendBackend = {
  answer: (
    method: string,
    path: string,
    body?: unknown,
  ) => Promise<Answer | undefined>;
  // The data starts again from this, as when the shared world changed.
  replace: (data: Data) => void;
};

// Where the changes go besides the pretend backend's own copy.
type Store = { write: (changes: Change[]) => Promise<void> };

type NewItem = { name: string; note: string };

function newItemOf(body: unknown): NewItem | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const { name, note } = body as Record<string, unknown>;
  if (typeof name !== "string" || name.trim() === "") return undefined;
  return { name: name.trim(), note: typeof note === "string" ? note : "" };
}

export function pretendBackend(
  start: Data = normalDay(),
  store?: Store,
): PretendBackend {
  let data = structuredClone(start);

  async function add(body: unknown): Promise<Answer> {
    const fields = newItemOf(body);
    if (!fields)
      return {
        status: 400,
        body: { error: "invalid_item", message: "An item needs a name." },
      };
    const item = {
      id: `item-${crypto.randomUUID()}`,
      ...fields,
      updated_at: new Date().toISOString(),
    };
    data.items.push(item);
    await store?.write([{ table: "items", op: "add", row: item }]);
    return { status: 201, body: item };
  }

  function answer(method: string, path: string, body?: unknown) {
    if (path !== "/api/items") return Promise.resolve(undefined);
    if (method === "GET") return Promise.resolve({ status: 200, body: data });
    if (method === "POST") return add(body);
    return Promise.resolve(undefined);
  }

  return {
    answer,
    replace: (next) => {
      data = structuredClone(next);
    },
  };
}
