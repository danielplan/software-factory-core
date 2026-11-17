// What `software-factory check` looks at in Kobble's files: that each file
// fits, and that what a record names is there (a signal's persona, an
// exploration's signals and personas). Each problem starts with where it is.

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
  read(() => [store.sync()]);
  const known = (ids: { id: string }[] | null) => ({
    has: (id: string) => ids === null || ids.some((one) => one.id === id),
  });
  const persona = known(personas);
  const signal = known(signals);
  const missing = (where: string, what: string, id: string) =>
    `${KOBBLE_FOLDER}/${where}: there is no ${what} “${id}”.`;
  for (const one of signals)
    if (one.persona && !persona.has(one.persona))
      problems.push(missing(`signals/${one.id}.json`, "persona", one.persona));
  for (const one of explorations) {
    const where = `explorations/${one.id}/exploration.json`;
    for (const id of one.personas.filter((p) => !persona.has(p)))
      problems.push(missing(where, "persona", id));
    for (const id of one.signals.filter((s) => !signal.has(s)))
      problems.push(missing(where, "signal", id));
  }
  return { checked: true, problems };
}
