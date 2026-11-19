// The prototype switch. A prototype is this app in a browser (or in Expo Go)
// against a pretend backend with made-up data, made by the factory to try an
// idea (see prototype/ and README.md). EXPO_PUBLIC_PROTOTYPE is set only by
// `npm run prototype`, `npm run prototype:live` and `npm run prototype:phone`;
// Expo writes its value into the app when it builds it, so in every other
// build the condition is false and the bundler leaves the prototype out. This
// file is the only way from src/ into prototype/ (checked by
// .dependency-cruiser.cjs).

const listeners = new Set<() => void>();

/**
 * Calls `listener` each time the prototype's made-up data changes under the
 * app (a shared world changed on another device); returns how to stop. In
 * the real app nothing ever calls it.
 */
export function whenPrototypeDataChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tells every listener that the made-up data changed. */
export function prototypeDataChanged() {
  for (const listener of listeners) listener();
}

/** Resolves once the prototype has started; null in the real app. */
export const prototypeStarted: Promise<void> | null =
  process.env.EXPO_PUBLIC_PROTOTYPE === '1'
    ? import('../../prototype/start')
        .then((prototype) => prototype.startPrototype(prototypeDataChanged))
        .then(() => undefined)
    : null;
