// Understand's second level: one persona. Who they are in one line (their
// role, what they are based on, what they want), what really matters to
// them (Yes, that's it while only the kobold suggested it), then three
// tabs: their problems (each with the situation it happens in and where it
// stands, leading to its story), everything people like them said, and
// the tests the kobold will run as them (to come).

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, type PersonaPage, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { RowList } from "@/components/row-list";
import { Button } from "@/components/ui/button";
import { problemRows } from "@/lib/rows";
import { cn } from "@/lib/utils";

import { Initial } from "./bits";
import { useAllRecords } from "./use-records";
import { saidOf } from "./view";

const TABS = ["problems", "signals", "tests"] as const;
type Tab = (typeof TABS)[number];
const TAB_NAME = {
  problems: "tabs.problems",
  signals: "tabs.signals",
  tests: "tabs.tests",
} as const;

export function PersonaView({
  page,
  tint,
}: Readonly<{ page: PersonaPage; tint: string }>) {
  const { t } = useTranslation("understand");
  const [tab, setTab] = useState<Tab>("problems");
  const { data: all } = useAllRecords();
  const rows = rowsOf(page);
  const said = all ? saidOf(all.records, page.persona.id) : [];
  const counts: Record<Tab, number | null> = {
    problems: rows.length,
    signals: said.length,
    tests: null,
  };
  return (
    <div className="grid content-start gap-4">
      <Profile page={page} tint={tint} />
      {page.realProblems.map((real) => (
        <RealProblem key={real.id} page={page} id={real.id} />
      ))}
      <div
        role="tablist"
        aria-label={t("tabs.label")}
        className="flex w-fit gap-1 rounded-[14px] bg-surface-2 p-1"
      >
        {TABS.map((one) => (
          <button
            key={one}
            type="button"
            role="tab"
            aria-selected={tab === one}
            onClick={() => {
              setTab(one);
            }}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-item text-muted-foreground transition-colors hover:text-foreground",
              tab === one && "bg-card text-foreground shadow-current",
            )}
          >
            {t(TAB_NAME[one])}
            {counts[one] !== null && (
              <span className="text-tag text-muted-foreground">
                {counts[one]}
              </span>
            )}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        aria-label={t(TAB_NAME[tab])}
        className="grid animate-enter rounded-[18px] bg-card px-5 py-3 shadow-soft"
        key={tab}
      >
        {tab === "problems" && (
          <RowList rows={rows} empty={t("person.nothingYet")} />
        )}
        {tab === "signals" && <Said said={said} />}
        {tab === "tests" && (
          <p className="py-3 text-body text-muted-foreground">
            {t("tabs.testsSoon", { name: page.persona.name })}
          </p>
        )}
      </section>
    </div>
  );
}

// Their problems, each with the situation it happens in (their name is the
// page's).
function rowsOf(page: PersonaPage) {
  const titles = new Map(page.stories.map((story) => [story.id, story.title]));
  return problemRows([page]).map((row) => ({
    ...row,
    who: titles.get(row.id) ?? null,
  }));
}

// Who they are, in one line under the title.
function Profile({
  page,
  tint,
}: Readonly<{ page: PersonaPage; tint: string }>) {
  const { t } = useTranslation("understand");
  const { persona } = page;
  const about = [persona.role, ...persona.basedOn].filter(Boolean);
  return (
    <div className="flex items-center gap-4">
      <Initial name={persona.name} tint={tint} big />
      <div className="grid min-w-0 gap-0.5">
        <span className="text-note text-muted-foreground">
          {about.join(" · ")}
        </span>
        {persona.wants.length > 0 && (
          <span className="text-body">
            {t("person.wantsLine", { wants: persona.wants.join(" · ") })}
          </span>
        )}
      </div>
    </div>
  );
}

function Said({ said }: Readonly<{ said: ReturnType<typeof saidOf> }>) {
  const { t } = useTranslation("understand");
  if (said.length === 0)
    return (
      <p className="py-3 text-body text-muted-foreground">
        {t("person.nothingYet")}
      </p>
    );
  return (
    <ul className="grid">
      {said.map((one) => (
        <li
          key={one.id}
          className="grid gap-0.5 border-t border-border-soft py-2.5 first:border-t-0"
        >
          <span className="text-body">{one.text}</span>
          <span className="text-note text-muted-foreground">
            {[one.source, one.when].filter(Boolean).join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

// What really matters to them, and who said so; Yes, that's it while only
// the kobold suggested it.
function RealProblem({
  page,
  id,
}: Readonly<{ page: PersonaPage; id: string }>) {
  const { t } = useTranslation("understand");
  const [problem, setProblem] = useState<string | null>(null);
  const real = page.realProblems.find((r) => r.id === id);
  if (!real) return null;
  const confirm = async () => {
    setProblem(null);
    try {
      await post("/api/understand/confirm", { realProblem: id });
    } catch (error) {
      setProblem(messageOf(error));
    }
  };
  return (
    <section
      aria-label={t("person.real")}
      className="grid gap-1 rounded-[18px] bg-card px-5 py-4 shadow-soft"
    >
      <span className="text-tag text-muted-foreground">{t("person.real")}</span>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-section">{real.title}</h2>
        {real.by === "kobold" ? (
          <Button size="sm" onClick={() => void confirm()}>
            {t("person.confirm")}
          </Button>
        ) : (
          <span className="text-note text-muted-foreground">
            {t("person.confirmedBy", { name: real.by })}
          </span>
        )}
      </div>
      {problem && <ProblemBox title={t("person.cantConfirm")} text={problem} />}
    </section>
  );
}
