import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// There are no items yet: said plainly, never confused with a failed load.
export function NoItems() {
  const { t } = useTranslation("home");
  return (
    <Empty className="border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{t("empty.title")}</EmptyTitle>
        <EmptyDescription>{t("empty.text")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
