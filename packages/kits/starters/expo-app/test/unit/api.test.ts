import { http, HttpResponse } from 'msw';
import { ApiError, refusal } from '@/api/api-error';
import { apiUrlFor } from '@/api/api-url';
import { itemsSchema } from '@/api/items.schema';
import { request } from '@/api/request';
import { pretendApi, pretendServer } from '../pretend-backend';

test('the address comes from the common setting, then the platform', () => {
  expect(apiUrlFor('ios', { common: 'http://a.test/', ios: 'x' })).toBe(
    'http://a.test',
  );
  expect(apiUrlFor('android', { android: 'http://b.test//' })).toBe(
    'http://b.test',
  );
  expect(apiUrlFor('ios', { ios: 'http://c.test' })).toBe('http://c.test');
  expect(() => apiUrlFor('ios', {})).toThrow(/EXPO_PUBLIC_API_URL/);
});

test('a refusal keeps the backend code, or names what the app saw', () => {
  const refused = refusal(400, {
    error: 'invalid_request',
    message: 'Bad',
    params: { field: 'name' },
  });
  expect([refused.code, refused.fallback, refused.params]).toEqual([
    'invalid_request',
    'Bad',
    { field: 'name' },
  ]);
  expect(refusal(429, 'busy').code).toBe('too_many_requests');
  expect(refusal(502, null).code).toBe('service_unavailable');
});

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error instanceof ApiError ? error.code : 'not an ApiError';
  }
  return 'no error';
}

test('an answer of the wrong shape or not JSON is refused', async () => {
  pretendServer.use(
    http.get(`${pretendApi}/api/items`, () => HttpResponse.json({ items: 1 }), {
      once: true,
    }),
    http.get(`${pretendApi}/api/text`, () => HttpResponse.text('hello')),
    http.get(`${pretendApi}/api/broken`, () =>
      HttpResponse.text('oops', { status: 500 }),
    ),
  );
  expect(await codeOf(request('/api/items', itemsSchema))).toBe(
    'invalid_response',
  );
  expect(await codeOf(request('/api/text', itemsSchema))).toBe(
    'invalid_response',
  );
  expect(await codeOf(request('/api/broken', itemsSchema))).toBe(
    'service_unavailable',
  );
});

test('no answer is a network problem, or an unconfirmed change', async () => {
  pretendServer.use(
    http.all(`${pretendApi}/api/down`, () => HttpResponse.error()),
  );
  expect(await codeOf(request('/api/down', itemsSchema))).toBe(
    'network_unreachable',
  );
  expect(
    await codeOf(
      request('/api/down', itemsSchema, { method: 'POST', body: { a: 1 } }),
    ),
  ).toBe('action_unconfirmed');
});
