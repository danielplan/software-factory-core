import { http, HttpResponse } from 'msw';
import {
  prototypeDataChanged,
  whenPrototypeDataChanges,
} from '@/lib/prototype-mode';
import { startPrototype } from '../../prototype/start';
import {
  currentData,
  pretendApi,
  pretendServer,
  saveChangesWith,
  setData,
} from '../pretend-backend';

// The prototype's pretend backend takes changes, and joins the factory's
// shared world when it is given one: its data, its changes and its writes.

jest.mock('../../prototype/platform', () => ({
  announce: jest.fn(),
  chosenSituation: () => 'empty',
  followReloads: () => undefined,
  forgetStoredData: () => undefined,
  reportScreens: () => undefined,
  startPretendBackend: () => Promise.resolve(),
}));

const announce = jest.requireMock<{ announce: jest.Mock }>(
  '../../prototype/platform',
).announce;

const add = (body: unknown) =>
  fetch(`${pretendApi}/api/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

afterEach(() => {
  saveChangesWith(null);
  delete process.env.EXPO_PUBLIC_FACTORY_WORLD_URL;
});

test('the pretend backend adds an item, and refuses one without a name', async () => {
  setData({ items: [] });
  const added = await add({ name: ' Paper ', note: '' });
  expect(added.status).toBe(201);
  expect(currentData().items).toEqual([
    expect.objectContaining({ name: 'Paper', note: null }),
  ]);
  expect((await add({ name: '' })).status).toBe(400);
  expect((await add('nothing')).status).toBe(400);
});

test('a change the shared world refuses is not kept', async () => {
  setData({ items: [] });
  saveChangesWith(() => Promise.reject(new Error('away')));
  expect((await add({ name: 'Paper' })).status).toBe(503);
  expect(currentData().items).toEqual([]);
});

test('without a shared world the prototype starts in the chosen situation', async () => {
  const stop = await startPrototype();
  stop();
  expect(currentData().items).toEqual([]);
  expect(announce).toHaveBeenLastCalledWith(
    expect.objectContaining({ current: 'empty', world: false }),
  );
});

const worldUrl = 'https://world.example.invalid/world';
const item = { id: 'w-1', name: 'From the world', note: null };

test('with a shared world the prototype reads it, writes to it and follows it', async () => {
  let version = 1;
  let items: object[] = [item];
  const posted: unknown[] = [];
  pretendServer.use(
    http.get(worldUrl, () =>
      HttpResponse.json({
        situation: 'shared',
        version,
        signed_in: {},
        tables: { items },
      }),
    ),
    http.post(worldUrl, async ({ request }) => {
      posted.push(await request.json());
      return HttpResponse.json({});
    }),
  );
  process.env.EXPO_PUBLIC_FACTORY_WORLD_URL = worldUrl;
  const changed = jest.fn();
  const stop = await startPrototype(changed);
  expect(currentData().items).toEqual([item]);
  expect(announce).toHaveBeenLastCalledWith(
    expect.objectContaining({ current: 'shared', world: true }),
  );
  await add({ name: 'Mine' });
  expect(posted).toHaveLength(1);
  expect(posted[0]).toMatchObject({
    version: 1,
    changes: [{ table: 'items', op: 'add', row: { name: 'Mine' } }],
  });
  version = 2;
  items = [];
  await new Promise((resolve) => setTimeout(resolve, 2300));
  stop();
  expect(changed).toHaveBeenCalledTimes(1);
  expect(currentData().items).toEqual([]);
});

test('the app hears when the made-up data changes, until it stops listening', () => {
  const listener = jest.fn();
  const stop = whenPrototypeDataChanges(listener);
  prototypeDataChanged();
  stop();
  prototypeDataChanged();
  expect(listener).toHaveBeenCalledTimes(1);
});
