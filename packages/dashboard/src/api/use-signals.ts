// The new signals and the sync's state, read again whenever Kobble's files
// change; the Signals page and the sidebar's count use them.

import type { SignalsView } from "@/api/client";
import { type Read, useRead } from "@/api/use-read";

export const useSignals = () =>
  useRead("/api/kobble/signals") as Read<SignalsView>;
