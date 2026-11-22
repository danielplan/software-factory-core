// The explorations, read again whenever Kobble's files change; the
// Explorations page, Home and the sidebar's count use them. Not read while
// Explorations is not installed (`installed` false).

import type { ExplorationsView } from "@/api/client";
import { type Read, useRead } from "@/api/use-read";

export const useExplorations = (installed = true) =>
  useRead(
    installed ? "/api/kobble/explorations" : null,
  ) as Read<ExplorationsView>;
