// What `software-factory check` looks at in Kobble's files: that each file
// fits, and that what a record names is there (a signal's persona, an
// exploration's or a test's signals and personas). Each problem starts with where it is.

import { existsSync } from "node:fs";

import { messageOf } from "../products/product.ts";
import { KOBBLE_FOLDER, KobbleStore } from "./store.ts";

export function checkKobbleIn(factory: string): {
  checked: boolean;
  problems: string[];
} {
  const store = new KobbleStore(factory);
  if (!existsSync(store.root)) return { checked: false, problems: [] };
  const problems: string[] = [];
  // What could be read; null when a file did not fit, so what it names is
  // not checked against it.
  const read = <T>(what: () => T[]): T[] | null => {
    try {
      return what();
    } catch (error) {
      problems.push(`${KOBBLE_FOLDER}/${messageOf(error)}`);
      return null;
    }
  };
  const signals = read(() => store.all("signals")) ?? [];
  const personas = read(() => store.all("personas"));
  const explorations = read(() => store.all("explorations")) ?? [];
  const tests = read(() => store.all("tests")) ?? [];
  read(() => [store.sync()]);
  const known = (ids: { id: string }[] | null) => ({
    has: (id: string) => ids === null || ids.some((one) => one.id === id),
  });
  const persona = known(personas);
  const signal = known(signals);
  // Each file, with the personas and signals it names.
  const naming = [
    ...signals.map((one) => ({
      where: `signals/${one.id}.json`,
      personas: one.persona ? [one.persona] : [],
      signals: [],
    })),
    ...explorations.map((one) => ({
      where: `explorations/${one.id}/exploration.json`,
      personas: one.personas,
      signals: one.signals,
    })),
    ...tests.map((one) => ({
      where: `tests/${one.id}.json`,
      personas: [one.persona],
      signals: one.signals,
    })),
  ];
  for (const { where, ...named } of naming) {
    const gone = [
      ...named.personas
        .filter((id) => !persona.has(id))
        .map((id) => `persona “${id}”`),
      ...named.signals
        .filter((id) => !signal.has(id))
        .map((id) => `signal “${id}”`),
    ];
    for (const what of gone)
      problems.push(`${KOBBLE_FOLDER}/${where}: there is no ${what}.`);
  }
  return { checked: true, problems };
}
