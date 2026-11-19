import { setupWorker } from 'msw/browser';
import { pretendHandlers, recordCall } from './pretend-backend';

// The prototype in a browser: the pretend backend is MSW's service worker,
// served from the prototype's own address (public/mockServiceWorker.js), and
// the page talks to the frame around it (the factory's page).

// Where the prototype is served, for example /prototypes/new-phone-app/v1
// (app.config.ts sets it from `npm run prototype -- --base`).
const base = process.env.EXPO_BASE_URL ?? '';

const storageName = 'new-phone-app';
const situationKey = `${storageName}.prototype-situation`;

/**
 * The situation named in the page's address: ?situation=<key>. The app
 * may change the address as the person moves, so this browser tab
 * remembers the last one named, and reloading starts that one again.
 */
export function chosenSituation() {
  const named = new URLSearchParams(window.location.search).get('situation');
  if (named) sessionStorage.setItem(situationKey, named);
  return named ?? sessionStorage.getItem(situationKey);
}

/** Forgets what the app kept in the browser at an earlier start. */
export function forgetStoredData() {
  const keys = Array.from({ length: localStorage.length }, (_, index) =>
    localStorage.key(index),
  );
  for (const key of keys)
    if (key?.startsWith(storageName)) localStorage.removeItem(key);
}

/** Starts the pretend backend. */
export async function startPretendBackend() {
  // The service worker answers only pages under `${base}/`: the address
  // without the last slash opens again with it, and this start waits for that.
  if (base && window.location.pathname === base) {
    window.location.replace(`${base}/${window.location.search}`);
    return new Promise<never>(() => undefined);
  }
  const worker = setupWorker(...pretendHandlers);
  worker.events.on('request:start', ({ request }) => {
    recordCall(request);
  });
  await worker.start({
    serviceWorker: {
      url: `${base}/mockServiceWorker.js`,
      options: { scope: `${base}/` },
    },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}

/** Tells the frame around the page about the prototype. */
export function announce(message: object) {
  window.parent.postMessage(message, '*');
}

const thisComputer = new Set(['localhost', '127.0.0.1']);

/**
 * The factory asks the page to load again after its prototype maker's change
 * (words in the translation files do not refresh by themselves): it reloads
 * in place, on the screen it shows.
 */
export function followReloads(): void {
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (event.source !== window.parent) return;
    if (!URL.canParse(event.origin)) return;
    if (!thisComputer.has(new URL(event.origin).hostname)) return;
    const data = event.data as { type?: unknown } | null;
    if (data?.type === 'factory-reload') window.location.reload();
  });
}

/**
 * Tells the frame around the page which screen it shows (its path within
 * the prototype), each time it changes, so the factory can open that same
 * screen elsewhere (for example in Expo Go).
 */
export function reportScreens(): void {
  let last = '';
  const tell = () => {
    const path = window.location.pathname.slice(base.length) || '/';
    if (path === last) return;
    last = path;
    window.parent.postMessage({ type: 'factory-screen', path }, '*');
  };
  for (const name of ['pushState', 'replaceState'] as const) {
    const original = window.history[name].bind(window.history);
    window.history[name] = (...args: Parameters<History['pushState']>) => {
      original(...args);
      tell();
    };
  }
  window.addEventListener('popstate', tell);
  tell();
}
