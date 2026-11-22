// The explorations, read again whenever Kobble's files change; the
// Explorations page, Home and the sidebar's count use them.

import type { ExplorationsView } from "@/api/client";
import { type Read, useRead } from "@/api/use-read";

export const useExplorations = () =>
  useRead("/api/kobble/explorations") as Read<ExplorationsView>;
