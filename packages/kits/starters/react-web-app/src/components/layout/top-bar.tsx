import { useTranslation } from "react-i18next";

// The bar at the top of every page: the app's name.
export function TopBar() {
  const { t } = useTranslation();
  return (
    <header className="flex items-center justify-between gap-4 bg-sidebar px-4 py-3 text-sidebar-foreground md:px-6 lg:px-10">
      <span className="text-figure font-semibold text-sidebar-accent-foreground">
        {t("wordmark")}
      </span>
    </header>
  );
}
