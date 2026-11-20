// The prototype runs on the board by itself: opening an exploration starts
// its prototype (the agreed one, otherwise the newest) when none runs, so
// the canvas shows the real screen, not a placeholder. Once per page visit;
// a prototype that failed or that someone stopped on purpose stays as it is
// until Open. Starting by itself is quiet: when it cannot (a project
// without a start command), Start stays, and pressing it says why.

import { useEffect, useRef } from "react";

import { type ExplorationPage, post } from "@/api";

import { toStart } from "./prototype-shown";

export function useLivePrototype(
  page: ExplorationPage | null | undefined,
): void {
  const tried = useRef(new Set<string>());
  const key = page ? toStart(page) : null;
  const id = page?.exploration.id;
  useEffect(() => {
    if (!id || !key || tried.current.has(`${id}/${key}`)) return;
    tried.current.add(`${id}/${key}`);
    post("/api/kobble/explorations/open", { id, key }).catch(() => undefined);
  }, [id, key]);
}
