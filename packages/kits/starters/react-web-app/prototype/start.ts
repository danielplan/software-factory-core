import { setupWorker } from "msw/browser";
import { pretendBackend, type PretendBackend } from "./pretend-backend.ts";
import { followReloads } from "./reloads.ts";
import { pretendHandler } from "./pretend-handler.ts";
import { sharedWorldBackend } from "./shared-world.ts";
import { situations } from "./situations.ts";

// Prototype mode only (npm run prototype): before the app renders, MSW's
// service worker starts answering /api with the pretend backend. Its data is
// the factory's shared world when the prototype was started with
// FACTORY_WORLD_URL (prototype/shared-world.ts); otherwise the situation
// named in ?situation= (the first one otherwise), and nothing is kept: a
// reload starts the situation again. The factory may ask for a reload after
// the prototype maker's change (prototype/reloads.ts). The page then tells
// the factory around it which situations it has.

async function backendFor(refresh: () => void): Promise<{
  backend: PretendBackend;
  current: string;
}> {
  const url = import.meta.env.VITE_FACTORY_WORLD_URL;
  if (url) {
    const shared = await sharedWorldBackend(url, refresh);
    return { backend: shared.backend, current: shared.situation };
  }
  const asked = new URLSearchParams(window.location.search).get("situation");
  const situation =
    situations.find((item) => item.key === asked) ?? situations[0];
  if (!situation) throw new Error("prototype/situations.ts lists none");
  return { backend: pretendBackend(situation.data()), current: situation.key };
}

export async function startPrototype(refresh: () => void = () => undefined) {
  followReloads();
  const { backend, current } = await backendFor(refresh);
  const base = import.meta.env.BASE_URL;
  await setupWorker(pretendHandler("/api/*", () => backend)).start({
    serviceWorker: {
      url: `${base}mockServiceWorker.js`,
      options: { scope: base },
    },
    onUnhandledRequest: "bypass",
    quiet: true,
  });
  window.parent.postMessage(
    {
      type: "factory-prototype",
      app: "new-web-app",
      situations: situations.map(({ key, name }) => ({ key, name })),
      current,
      world: Boolean(import.meta.env.VITE_FACTORY_WORLD_URL),
    },
    "*",
  );
}
