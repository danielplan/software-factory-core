import { useTranslation } from "react-i18next";

// Shown while the data, or a page's code, is loading.
export function LoadingState() {
  const { t } = useTranslation();
  return (
    <p role="status" className="m-0">
      {t("loading")}
    </p>
  );
}
