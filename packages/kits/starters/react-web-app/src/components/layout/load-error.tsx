import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/hooks/use-error-text";

// The data could not be loaded: what went wrong, and a button to try again.
// A failed load is never shown as an empty list.
export function LoadError({
  error,
  onRetry,
}: Readonly<{ error: unknown; onRetry: () => void }>) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  return (
    <Alert variant="destructive">
      <AlertTitle>{t("loadError.title")}</AlertTitle>
      <AlertDescription>
        <p>{errorText(error)}</p>
        <Button onClick={onRetry}>{t("loadError.retry")}</Button>
      </AlertDescription>
    </Alert>
  );
}
