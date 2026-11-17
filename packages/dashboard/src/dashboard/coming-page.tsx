import { useTranslation } from "react-i18next";

import { PageHead } from "@/components/page-head";
import { Card, CardContent } from "@/components/ui/card";

// The pages still to come, each with what it will hold.
const COMING = ["customers"] as const;

export type Coming = (typeof COMING)[number];

export function isComing(page: string): page is Coming {
  return COMING.some((one) => one === page);
}

// A page that is not built yet: its name, and what will be on it.
export function ComingPage({ page }: Readonly<{ page: Coming }>) {
  const { t } = useTranslation();
  return (
    <div className="grid content-start gap-4">
      <PageHead
        title={t(`coming.${page}.title`)}
        about={t(`coming.${page}.about`)}
      />
      <Card className="py-5">
        <CardContent className="grid gap-1 px-5">
          <p className="text-body text-muted-foreground">{t("coming.soon")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
