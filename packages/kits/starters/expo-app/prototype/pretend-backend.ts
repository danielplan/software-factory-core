import { http, HttpResponse } from 'msw';
import type { Change } from './world';

// A pretend backend: it answers the app's routes the way the real backend
// would (same paths, same answers, same refusals), from made-up data kept in
// memory, so the app runs without a database. It has one source for two
// users: the screen tests (test/pretend-backend.ts runs it in Node) and the
// prototype (prototype/start.ts runs it in the browser or in Expo Go). Its
// address is the one the tests and the prototype give the app.
//
// The data comes from a situation (prototype/situations.ts) or from the
// factory's shared world (prototype/world.ts); a change is also sent to the
// shared world when there is one (`saveChangesWith`).
//
// The starter has two made-up routes, GET and POST /api/items. Replace them
// with the routes the new app needs, in the backend's own shapes.
export const pretendApi = 'https://api.example.invalid';

export type Item = { id: string; name: string; note: string | null };

export type Data = {
  items: Item[];
  /** Every request the app made, as "METHOD /path". */
  calls: string[];
};

let data: Data = { items: [], calls: [] };
let save: ((changes: Change[]) => Promise<void>) | null = null;
let made = 0;

/** Puts the pretend backend's data in place; returns it. */
export function setData(next: Omit<Data, 'calls'>): Data {
  data = { ...next, calls: [] };
  return data;
}

/** Changes the data in place, keeping the requests made so far. */
export function replaceItems(items: Item[]) {
  data.items = items;
}

/** The data the pretend backend holds now. */
export const currentData = () => data;

/** Where each change also goes (the shared world), or nowhere. */
export function saveChangesWith(next: typeof save) {
  save = next;
}

function newItem(body: unknown): Item | null {
  if (typeof body !== 'object' || body === null) return null;
  const { name, note } = body as { name?: unknown; note?: unknown };
  if (typeof name !== 'string' || name.trim() === '') return null;
  made += 1;
  return {
    id: `item-${Date.now().toString(36)}-${made}`,
    name: name.trim(),
    note: typeof note === 'string' && note !== '' ? note : null,
  };
}

async function addItem(request: globalThis.Request) {
  const item = newItem(await request.json().catch(() => null));
  if (!item)
    return HttpResponse.json(
      {
        error: 'invalid_request',
        message: 'An item needs a name.',
        params: { field: 'name' },
      },
      { status: 400 },
    );
  try {
    await save?.([{ table: 'items', op: 'add', row: item }]);
  } catch {
    return HttpResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }
  data.items = [...data.items, item];
  return HttpResponse.json({ item }, { status: 201 });
}

/** Every route of the pretend backend, for MSW. */
export const pretendHandlers = [
  http.get(`${pretendApi}/api/items`, () =>
    HttpResponse.json({ items: data.items }),
  ),
  http.post(`${pretendApi}/api/items`, ({ request }) => addItem(request)),
];

/** Notes a request the app made in the data's calls, as "METHOD /path". */
export function recordCall(request: globalThis.Request) {
  data.calls.push(
    `${request.method} ${new URL(request.url).pathname.replace(/^\/api/, '')}`,
  );
}
