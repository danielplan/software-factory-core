// One thing the check-up found, as a card: how serious it is and what kind
// (an icon and a word, never colour alone), the problem in plain words,
// what happens to a person, how to fix it, and where it is; then Send to
// Build or Not a problem, and what came of it.

import {
  Bug,
  CircleAlert,
  Gauge,
  Info,
  MousePointerClick,
  OctagonAlert,
  ShieldAlert,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post } from "@/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Found, Severity } from "./view";

const SEVERITY: Record<Severity, { look: string; icon: ReactNode }> = {
  high: {
    look: "bg-open text-open-foreground",
    icon: <OctagonAlert aria-hidden />,
  },
  medium: {
    look: "bg-solving text-solving-foreground",
    icon: <TriangleAlert aria-hidden />,
  },
  low: { look: "bg-wrong text-wrong-foreground", icon: <Info aria-hidden /> },
};

const KIND: Record<Found["kind"], ReactNode> = {
  bug: <Bug aria-hidden />,
  error: <XCircle aria-hidden />,
  ux: <MousePointerClick aria-hidden />,
  security: <ShieldAlert aria-hidden />,
  performance: <Gauge aria-hidden />,
};

export function SeverityPill({ severity }: Readonly<{ severity: Severity }>) {
  const { t } = useTranslation("checks");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-tag [&_svg]:size-3.5",
        SEVERITY[severity].look,
      )}
    >
      {SEVERITY[severity].icon}
      {t(`severity.${severity}`)}
    </span>
  );
}

export function FindingCard({
  finding,
  showProduct,
}: Readonly<{ finding: Found; showProduct: boolean }>) {
  const { t } = useTranslation("checks");
  return (
    <article className="grid animate-enter content-start gap-3 rounded-[18px] bg-card p-5 shadow-soft transition-shadow hover:shadow-lift">
      <header className="flex flex-wrap items-center gap-2">
        <SeverityPill severity={finding.severity} />
        <span className="inline-flex items-center gap-1 text-tag text-muted-foreground [&_svg]:size-3.5">
          {KIND[finding.kind]}
          {t(`kind.${finding.kind}`)}
        </span>
        {showProduct && (
          <span className="ml-auto text-tag text-muted-foreground">
            {t("finding.in", { name: finding.productName })}
          </span>
        )}
      </header>
      <div className="grid gap-1">
        <h3 className="text-item">{finding.title}</h3>
        <p className="text-body text-foreground-2">{finding.happens}</p>
      </div>
      {finding.suggestion && (
        <Part label={t("finding.fix")}>{finding.suggestion}</Part>
      )}
      <p className="text-note text-muted-foreground">
        <span className="sr-only">{t("finding.where")}: </span>
        <code className="rounded-md bg-surface px-1.5 py-0.5 font-mono break-all">
          {finding.where}
        </code>
      </p>
      <Actions finding={finding} />
    </article>
  );
}

function Part({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="grid gap-0.5">
      <span className="text-tag text-muted-foreground">{label}</span>
      <p className="text-body text-foreground-2">{children}</p>
    </div>
  );
}

// Send to Build or Not a problem, while it is open; what came of sending it.
function Actions({ finding }: Readonly<{ finding: Found }>) {
  const { t } = useTranslation("checks");
  const [said, setSaid] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const body = { product: finding.product, finding: finding.id };
  const send = async () => {
    setProblem(null);
    try {
      const sent = await post<{ issue: number | null }>(
        "/api/checks/send",
        body,
      );
      setSaid(
        sent.issue === null
          ? t("finding.waiting")
          : t("finding.sent", { issue: sent.issue }),
      );
    } catch (error) {
      setProblem(messageOf(error));
    }
  };
  const dismiss = () => {
    setProblem(null);
    post("/api/checks/dismiss", body).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  return (
    <div className="grid gap-2 pt-1">
      {finding.status === "open" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void send()}>
            {t("finding.send")}
          </Button>
          <Button size="sm" variant="outline" onClick={dismiss}>
            {t("finding.dismiss")}
          </Button>
        </div>
      ) : (
        <p className="text-note text-muted-foreground">
          {said ?? statusWords(finding, t)}
        </p>
      )}
      {said && finding.status === "open" && (
        <p className="text-note text-muted-foreground">{said}</p>
      )}
      {problem && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-note text-destructive [&_svg]:size-4"
        >
          <CircleAlert aria-hidden />
          {t("problem", { why: problem })}
        </p>
      )}
    </div>
  );
}

function statusWords(
  finding: Found,
  t: ReturnType<typeof useTranslation<"checks">>["t"],
): string {
  if (finding.status === "dismissed") return t("finding.dismissed");
  return finding.issue === null
    ? t("finding.onBuild")
    : t("finding.sent", { issue: finding.issue });
}
