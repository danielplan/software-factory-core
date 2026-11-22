import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/api-error";
import { isErrorCode } from "@/i18n/resources";

// What a person reads when a request fails: the error's code in the active
// language, filled in with its values; it follows a change of language. The
// backend's English sentence is only used for a code this app does not know
// yet.
export function useErrorText() {
  const { t } = useTranslation("errors");
  return useCallback(
    (error: unknown): string => {
      if (!(error instanceof ApiError)) return t("invalid_response");
      const { code, params, fallback } = error;
      if (!isErrorCode(code)) return fallback ?? t("invalid_response");
      return t(code, params);
    },
    [t],
  );
}
