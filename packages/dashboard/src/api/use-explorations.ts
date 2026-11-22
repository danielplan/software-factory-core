// The explorations, read again whenever Kobble's files change; the
// Explorations page, Home and the sidebar's count use them. Not read while
// Explorations is not installed (`installed` false).

import { useRead } from "@/api/query";
import { explorationsViewSchema } from "@/api/schemas/explorations";

export const useExplorations = (installed = true) =>
  useRead(
    installed ? "/api/kobble/explorations" : null,
    explorationsViewSchema,
  );
