import { afterEach, expect, test, vi } from "vitest";
import { pretendBackend } from "../prototype/pretend-backend.ts";
import { fromWorld, sharedWorldBackend } from "../prototype/shared-world.ts";
import { worldLink, type World } from "../prototype/world.ts";

// The shared made-up world: the pretend backend reads its tables from the
// factory, writes its changes there (again on a newer world when its
// version is stale), and follows others' changes. A fake fetch stands in
// for the factory.

const URL_ = "http://127.0.0.1:9/world";

// What fetch is called with.
type Address = string | URL | Request;

function worldAt(version: number, names: string[]): World {
  return {
    situation: "busy",
    version,
    signed_in: { person: "someone" },
    tables: {
      items: names.map((name, index) => ({
        id: `w-${index}`,
        name,
        note: "",
        updated_at: "2026-11-01T09:00:00Z",
      })),
    },
  };
}

// A factory that keeps one world and refuses a stale version with 409.
function fakeFactory(start: World) {
  let world = start;
  const posts: unknown[] = [];
  const fetchFn = vi.fn((_url: Address, init?: RequestInit) => {
    if (init?.method !== "POST") return Promise.resolve(Response.json(world));
    const body = JSON.parse(init.body as string) as {
      version: number;
      changes: { row: Record<string, unknown> }[];
    };
    posts.push(body);
    if (body.version !== world.version)
      return Promise.resolve(new Response(null, { status: 409 }));
    const added = body.changes.map((change) => change.row);
    world = {
      ...world,
      version: world.version + 1,
      tables: { items: [...(world.tables.items ?? []), ...added] },
    };
    return Promise.resolve(Response.json(world));
  });
  return {
    fetchFn,
    posts,
    set: (next: World) => {
      world = next;
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("the app's data is the world's items table", () => {
  expect(fromWorld(worldAt(1, ["A"])).items.map((item) => item.name)).toEqual([
    "A",
  ]);
  expect(fromWorld({ ...worldAt(1, []), tables: {} })).toEqual({ items: [] });
});

test("a change on a stale version is made again on the newer world", async () => {
  const factory = fakeFactory(worldAt(1, ["A"]));
  const link = worldLink(URL_, factory.fetchFn);
  await link.read();
  factory.set(worldAt(2, ["A", "B"]));
  await link.write([{ table: "items", op: "add", row: { id: "c" } }]);
  expect(
    factory.posts.map((post) => (post as { version: number }).version),
  ).toEqual([1, 2]);
  expect((await link.read()).tables.items).toHaveLength(3);
});

test("a world that keeps changing, or refuses, is an error", async () => {
  const stale = vi.fn((_url: Address, init?: RequestInit) =>
    Promise.resolve(
      init?.method === "POST"
        ? new Response(null, { status: 409 })
        : Response.json(worldAt(1, [])),
    ),
  );
  await expect(
    worldLink(URL_, stale).write([{ table: "items", op: "add", row: {} }]),
  ).rejects.toThrow(/kept changing/);
  const refused = vi.fn((_url: Address, init?: RequestInit) =>
    Promise.resolve(
      init?.method === "POST"
        ? new Response(null, { status: 500 })
        : Response.json(worldAt(1, [])),
    ),
  );
  await expect(
    worldLink(URL_, refused).write([{ table: "items", op: "add", row: {} }]),
  ).rejects.toThrow(/refused/);
  const broken = vi.fn(() => Promise.resolve(Response.json({ nope: true })));
  await expect(worldLink(URL_, broken).read()).rejects.toThrow(/did not/);
});

test("following the world tells only of new versions", async () => {
  vi.useFakeTimers();
  const factory = fakeFactory(worldAt(1, ["A"]));
  const link = worldLink(URL_, factory.fetchFn);
  await link.read();
  const seen: (string | number)[] = [];
  const stop = link.follow((world) => seen.push(world.version));
  await vi.advanceTimersByTimeAsync(2000);
  factory.set(worldAt(5, ["A", "B"]));
  await vi.advanceTimersByTimeAsync(2000);
  await vi.advanceTimersByTimeAsync(2000);
  stop();
  expect(seen).toEqual([5]);
});

test("the pretend backend on a shared world reads, writes and refreshes", async () => {
  vi.useFakeTimers();
  const factory = fakeFactory(worldAt(1, ["A"]));
  vi.stubGlobal("fetch", factory.fetchFn);
  const refresh = vi.fn();
  const shared = await sharedWorldBackend(URL_, refresh);
  expect(shared.situation).toBe("busy");
  const added = await shared.backend.answer("POST", "/api/items", {
    name: "New",
  });
  expect(added?.status).toBe(201);
  expect(factory.posts).toHaveLength(1);
  factory.set(worldAt(9, ["X", "Y"]));
  await vi.advanceTimersByTimeAsync(2000);
  shared.stop();
  expect(refresh).toHaveBeenCalled();
  const answer = await shared.backend.answer("GET", "/api/items");
  expect(answer?.body).toEqual(fromWorld(worldAt(9, ["X", "Y"])));
});

test("the pretend backend adds an item and refuses one without a name", async () => {
  const backend = pretendBackend({ items: [] });
  expect(
    (await backend.answer("POST", "/api/items", { name: " " }))?.status,
  ).toBe(400);
  expect((await backend.answer("POST", "/api/items", null))?.status).toBe(400);
  await backend.answer("POST", "/api/items", { name: "One", note: 3 });
  const list = await backend.answer("GET", "/api/items");
  expect(list?.body).toMatchObject({ items: [{ name: "One", note: "" }] });
  expect(await backend.answer("DELETE", "/api/items")).toBeUndefined();
  expect(await backend.answer("GET", "/api/other")).toBeUndefined();
});
