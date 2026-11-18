import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/api/api-error';
import { isErrorCode } from '@/i18n/resources';

/**
 * The words for any error, in the person's language: the backend's code
 * translated with its values, the backend's own English sentence for a code
 * the app does not know yet, and a general sentence for anything else.
 */
export function useErrorText() {
  const { t } = useTranslation();
  return useCallback(
    (error: unknown): string => {
      if (error instanceof ApiError && isErrorCode(error.code))
        return t(`errors:${error.code}`, { ...error.params });
      if (error instanceof ApiError && error.fallback) return error.fallback;
      return t('errors:unexpected');
    },
    [t],
  );
}
