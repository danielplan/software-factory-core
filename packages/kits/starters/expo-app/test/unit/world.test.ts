import { worldLink, type World } from '../../prototype/world';

// The link to the factory's shared made-up world: it reads the world, writes
// changes with the version it read (reading again when the version is
// stale), and follows the world's changes.

const world = (version: number, items: object[] = []): World => ({
  situation: 'normal-day',
  version,
  signed_in: {},
  tables: { items: items as World['tables'][string] },
});

type Sent = { method: string; body: unknown };

/** A pretend world server: answers in turn, and notes what it was sent. */
function fakeServer(answers: (() => Response)[]) {
  const sent: Sent[] = [];
  const fetchFn = (_url: unknown, init?: RequestInit) => {
    sent.push({
      method: init?.method ?? 'GET',
      body:
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as unknown)
          : undefined,
    });
    const next = answers.shift();
    if (!next) throw new Error('No answer left');
    return Promise.resolve(next());
  };
  return { sent, fetchFn: fetchFn as typeof fetch };
}

const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });

test('reading gives the world', async () => {
  const server = fakeServer([json(world(3, [{ id: 'a' }]))]);
  const read = await worldLink('http://w.test', server.fetchFn).read();
  expect(read.version).toBe(3);
  expect(read.tables.items).toEqual([{ id: 'a' }]);
});

test('a world that cannot be read is an error', async () => {
  const link = worldLink('http://w.test', fakeServer([json({}, 500)]).fetchFn);
  await expect(link.read()).rejects.toThrow(/500/);
  const odd = worldLink('http://w.test', fakeServer([json({ a: 1 })]).fetchFn);
  await expect(odd.read()).rejects.toThrow(/not readable/);
});

const change = { table: 'items', op: 'add' as const, row: { id: 'b' } };

test('a write sends the version read; a stale one reads again and retries', async () => {
  const server = fakeServer([
    json(world(1)),
    json({}, 409),
    json(world(2)),
    json({}),
  ]);
  await worldLink('http://w.test', server.fetchFn).write([change]);
  expect(server.sent).toEqual([
    { method: 'GET', body: undefined },
    { method: 'POST', body: { version: 1, changes: [change] } },
    { method: 'GET', body: undefined },
    { method: 'POST', body: { version: 2, changes: [change] } },
  ]);
});

test('a write gives up when refused or when the world keeps changing', async () => {
  const refused = fakeServer([json(world(1)), json({}, 400)]);
  await expect(
    worldLink('http://w.test', refused.fetchFn).write([change]),
  ).rejects.toThrow(/refused/);
  const busy = fakeServer(
    Array.from({ length: 3 }, () => [json(world(1)), json({}, 409)]).flat(),
  );
  await expect(
    worldLink('http://w.test', busy.fetchFn).write([change]),
  ).rejects.toThrow(/kept changing/);
});

test('following tells each new version once, through a failed look', async () => {
  const server = fakeServer([
    json(world(1)),
    json(world(1)),
    json({}, 500),
    json(world(2)),
    json(world(2)),
  ]);
  const link = worldLink('http://w.test', server.fetchFn);
  await link.read();
  const seen: (string | number)[] = [];
  const stop = link.follow((next) => seen.push(next.version), 5);
  await new Promise((resolve) => setTimeout(resolve, 60));
  stop();
  expect(seen).toEqual([2]);
});
