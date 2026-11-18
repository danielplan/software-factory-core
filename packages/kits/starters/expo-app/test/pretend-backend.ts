import { setupServer } from 'msw/node';
import { pretendHandlers, recordCall } from '../prototype/pretend-backend';

// The tests' pretend backend: the prototype's (prototype/pretend-backend.ts),
// run in Node by MSW. One source for both, so the prototype answers the way
// the tests check.
export * from '../prototype/pretend-backend';

export const pretendServer = setupServer(...pretendHandlers);

pretendServer.events.on('request:start', ({ request }) => {
  recordCall(request);
});
