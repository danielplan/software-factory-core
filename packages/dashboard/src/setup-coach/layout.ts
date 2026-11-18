// ELK, the Eclipse Layout Kernel, which arranges an exploration's canvas
// along its arrows (explorations/board/layout.ts). It is large, so it is
// loaded with the first canvas.

import type { ELK } from "elkjs/lib/elk-api";

let elk: Promise<ELK> | null = null;
export function layoutKernel(): Promise<ELK> {
  elk ??= import("elkjs/lib/elk.bundled.js").then(
    ({ default: Kernel }) => new Kernel(),
  );
  return elk;
}
