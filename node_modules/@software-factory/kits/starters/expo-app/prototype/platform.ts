import { setupServer } from 'msw/native';
import { pretendHandlers, recordCall } from './pretend-backend';

// The prototype on a phone, in Expo Go (npm run prototype:phone): the pretend
// backend answers inside the app (MSW for React Native). The browser's
// version is platform.web.ts.

/** The situation named by `npm run prototype:phone -- --situation <key>`. */
export const chosenSituation = () =>
  process.env.EXPO_PUBLIC_PROTOTYPE_SITUATION ?? null;

/** The app keeps nothing on the phone yet, so there is nothing to forget. */
export function forgetStoredData() {
  // Nothing kept.
}

export function startPretendBackend() {
  const server = setupServer(...pretendHandlers);
  server.events.on('request:start', ({ request }) => {
    recordCall(request);
  });
  server.listen({ onUnhandledRequest: 'bypass' });
  return Promise.resolve();
}

/** A phone has no frame around the app to tell. */
export function announce(_message: object) {
  // Nothing to tell.
}

/** In Expo Go there is no factory page around the app: nothing to follow. */
export function followReloads(): void {}

/** In Expo Go there is no factory page to tell which screen is shown. */
export function reportScreens(): void {}
