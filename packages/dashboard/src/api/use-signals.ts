// The new signals and the sync's state, read again whenever Kobble's files
// change; the Signals page and the sidebar's count use them.

import { useRead } from "@/api/query";
import { signalsViewSchema } from "@/api/schemas/signals";

export const useSignals = () =>
  useRead("/api/kobble/signals", signalsViewSchema);
