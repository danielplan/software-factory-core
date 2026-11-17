// Check-up (#checks): one click and the kobold reads the product's code,
// read only, looking for what could go wrong for the people who use it.
// Before any check, a friendly start card; while one runs, the kobold at
// work and what it found so far; then the findings as cards, the most
// serious first, each to send to Build or set aside, and those already
// handled folded away. Each check looks at part of the code, so what it
// finds adds to what was found before (a short note says so), and the last
// findings stay while a new check runs. Check again at the top.

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LANGUAGES } from "@/lib/language-choice";

import { refusalWords } from "../chat/refusals";
import { FindingCard, SeverityPill } from "./finding-card";
import { RunningCard, StartCard } from "./start-card";
import { useChecks } from "./use-checks";
import { type CheckupView, checkupOf, type ChecksView } from "./view";

export function ChecksPage() {
  const { t, i18n } = useTranslation("checks");
  const { data, problem, reload } = useChecks();
  const [said, setSaid] = useState<string | null>(null);
  const view = checkupOf(data);
  const language = LANGUAGES.find((one) => one.id === i18n.language)?.id;
  const press = (path: string, body: object) => {
    setSaid(null);
    post(path, body).then(reload, (error: unknown) => {
      setSaid(refusalWords(messageOf(error)));
    });
  };
  const start = (product?: string) => {
    press("/api/checks/start", { product, language });
  };
  const checked = (data?.checks.length ?? 0) > 0;
  const nameOf = (id: string) =>
    data?.products.find((one) => one.id === id)?.name ?? id;
  return (
    <div className="grid content-start gap-5">
      <PageHead
        crumbs={[
          { name: t("crumbSignals"), href: "#signals" },
          { name: t("title") },
        ]}
        title={t("title")}
        actions={
          <Again show={checked && view.running.length === 0} onStart={start} />
        }
      />
      {problem && <ProblemBox title={problem} />}
      {said && <ProblemBox title={t("problem", { why: said })} />}
      {data && !checked && (
        <StartCard products={data.products} onStart={start} />
      )}
      {view.running.map((check) => (
        <RunningCard
          key={check.product}
          check={check}
          name={nameOf(check.product)}
          onStop={() => {
            press("/api/checks/stop", { product: check.product });
          }}
        />
      ))}
      <Ended data={data} nameOf={nameOf} />
      {checked && (
        <Results view={view} several={(data?.products.length ?? 0) > 1} />
      )}
    </div>
  );
}

// Check again, at the top, once a check has run and none runs now.
function Again({
  show,
  onStart,
}: Readonly<{ show: boolean; onStart: () => void }>) {
  const { t } = useTranslation("checks");
  if (!show) return null;
  return (
    <Button
      onClick={() => {
        onStart();
      }}
    >
      {t("start.again")}
    </Button>
  );
}

// Checks that could not finish, or were stopped, each in a line.
function Ended({
  data,
  nameOf,
}: Readonly<{ data: ChecksView | null; nameOf: (id: string) => string }>) {
  const { t } = useTranslation("checks");
  const ended = (data?.checks ?? []).filter(
    (check) => check.state === "failed" || check.state === "stopped",
  );
  return ended.map((check) =>
    check.state === "failed" ? (
      <ProblemBox
        key={check.product}
        title={t("results.failed", {
          name: nameOf(check.product),
          why: check.said ?? "",
        })}
      />
    ) : (
      <p key={check.product} className="text-note text-muted-foreground">
        {t("results.stopped", { name: nameOf(check.product) })}
      </p>
    ),
  );
}

function Results({
  view,
  several,
}: Readonly<{ view: CheckupView; several: boolean }>) {
  const { t, i18n } = useTranslation("checks");
  const open = view.open.reduce((all, g) => all + g.findings.length, 0);
  return (
    <div className="grid gap-6">
      {view.lastEnded && (
        <div className="grid gap-0.5 text-note text-muted-foreground">
          <p>
            {t("results.last", {
              when: new Date(view.lastEnded).toLocaleString(i18n.language, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })}
            {view.running.length === 0 &&
              ` · ${t("results.found", { count: view.found })}`}
            {open > 0 && ` · ${t("results.toLook", { count: open })}`}
          </p>
          <p>{t("results.sample")}</p>
        </div>
      )}
      {view.allClear && <AllClear />}
      {view.open.map((group) => (
        <section key={group.severity} className="grid gap-3">
          <h2 className="flex items-center gap-2 text-section">
            <SeverityPill severity={group.severity} />
            <span className="text-note text-muted-foreground">
              {group.findings.length}
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                showProduct={several}
              />
            ))}
          </div>
        </section>
      ))}
      <Handled view={view} several={several} />
    </div>
  );
}

function AllClear() {
  const { t } = useTranslation("checks");
  return (
    <section className="flex animate-enter items-center gap-4 rounded-[18px] bg-solved px-5 py-4 text-solved-foreground">
      <CircleCheck aria-hidden className="size-8 flex-none" />
      <div className="grid gap-0.5">
        <b className="text-item">{t("results.clear")}</b>
      </div>
    </section>
  );
}

// What was sent to Build or set aside, folded away.
function Handled({
  view,
  several,
}: Readonly<{ view: CheckupView; several: boolean }>) {
  const { t } = useTranslation("checks");
  if (view.handled.length === 0) return null;
  return (
    <Collapsible className="grid gap-3">
      <CollapsibleTrigger className="justify-self-start text-note font-medium text-muted-foreground hover:text-foreground">
        {t("results.handled", { count: view.handled.length })}
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-4 opacity-80 sm:grid-cols-2 xl:grid-cols-3">
        {view.handled.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            showProduct={several}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
