import { ApiError } from "@/api/api-error";
import { i18n } from "@/i18n/i18n";
import { isErrorCode } from "@/i18n/resources";

// What a person reads when a request fails: the error's code in the active
// language, filled in with its values. The backend's English sentence is only
// used for a code this app does not know yet.
export function errorText(error: unknown): string {
  if (!(error instanceof ApiError)) return i18n.t("errors:invalid_response");
  const { code, params, fallback } = error;
  if (!isErrorCode(code)) return fallback ?? i18n.t("errors:invalid_response");
  return i18n.t(`errors:${code}`, params);
}
