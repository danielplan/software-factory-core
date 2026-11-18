import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Item } from "@/api/items.schema";
import { formatDay } from "@/i18n/format";

// The items, one card each.
export function ItemCards({ items }: Readonly<{ items: readonly Item[] }>) {
  const { t } = useTranslation("home");
  return (
    <section aria-label={t("itemsLabel")}>
      <h2>{t("count", { count: items.length })}</h2>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Card>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>
                  {t("updated", { day: formatDay(new Date(item.updated_at)) })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="m-0">{item.note}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
