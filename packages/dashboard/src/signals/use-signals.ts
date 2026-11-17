// The new signals and the sync's state, read again whenever Kobble's files
// change; the Signals page and the sidebar's count use them.

import type { SignalsView } from "@/api";
import { type Read, useRead } from "@/lib/use-read";

export const useSignals = () =>
  useRead("/api/kobble/signals") as Read<SignalsView>;
