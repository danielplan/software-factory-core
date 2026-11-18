import { notifyManager } from '@tanstack/react-query';
import { configure } from '@testing-library/react-native';
import { pretendServer } from './test/pretend-backend';
import { phone } from './test/phone';

// TanStack Query tells React about new answers within the test's own steps.
notifyManager.setScheduler((callback) => {
  queueMicrotask(callback);
});
// A whole screen loads its answers from the pretend backend before it shows.
configure({ asyncUtilTimeout: 4000 });

jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual<object>(
    '@react-native-community/netinfo/jest/netinfo-mock.js',
  ),
);

// The phone's language, as test/phone.ts sets it.
jest.mock('expo-localization', () => {
  const { phone: device } =
    jest.requireActual<typeof import('./test/phone')>('./test/phone');
  return { getLocales: () => [{ languageCode: device.language }] };
});

// Listening starts before any test file loads the app, so its first request
// is answered too.
pretendServer.listen({ onUnhandledRequest: 'error' });
afterEach(() => {
  pretendServer.resetHandlers();
  phone.reset();
});
afterAll(() => {
  pretendServer.close();
});
