import { useTranslation } from "react-i18next";
import { useItems } from "@/api/use-items";
import { LoadError } from "@/components/layout/load-error";
import { LoadingState } from "@/components/layout/loading-state";
import { ItemCards } from "@/features/home/components/item-cards";
import { NoItems } from "@/features/home/components/no-items";

// The home page: what this app is, and the items the backend lists. The new
// tool's own screens replace or join it.
export function HomePage() {
  const { t } = useTranslation("home");
  const query = useItems();
  return (
    <>
      <div className="mb-7">
        <h1>{t("title")}</h1>
        <p className="m-0 max-w-prose">{t("subtitle")}</p>
      </div>
      {query.isPending && <LoadingState />}
      {query.isError && (
        <LoadError error={query.error} onRetry={() => void query.refetch()} />
      )}
      {query.data &&
        (query.data.length > 0 ? (
          <ItemCards items={query.data} />
        ) : (
          <NoItems />
        ))}
    </>
  );
}
