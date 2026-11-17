// An idea's versions, then one row to send: each version a card to try it
// and vote for it (version-tile.tsx), and under them "Send B to Build" for
// the one with the most votes, or why it cannot go yet (a tie, no vote, or
// no GitHub board to send it to, with the way to Settings). Without
// versions it says so and leads to prototype mode, where they are made.

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type IdeaPage, messageOf, post, type VersionRun } from "@/api";
import { Button } from "@/components/ui/button";
import { exploreHash, prototypeHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { VersionTile } from "./version-tile";
import { runOf, sendLine } from "./view";

type OnProblem = (problem: string | null) => void;

export function IdeaSteps({
  page,
  runs,
  sendable,
  onProblem,
}: Readonly<{
  page: IdeaPage;
  runs: VersionRun[];
  sendable: boolean;
  onProblem: OnProblem;
}>) {
  const { t } = useTranslation("explore");
  if (page.versions.length === 0) return <NoVersions page={page} />;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-tag tracking-[0.04em] text-muted-foreground uppercase">
          {t("steps.heading")}
        </h3>
        <a
          href={prototypeHash(page.idea.id)}
          className="flex items-center gap-1 text-note font-medium text-primary hover:underline"
        >
          {t("steps.all")}
          <ArrowRight aria-hidden className="size-3.5" />
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {page.versions.map((version) => (
          <VersionTile
            key={version.key}
            version={version}
            run={runOf(runs, page.idea.id, version.key)}
            ahead={page.lead?.key === version.key}
            onProblem={onProblem}
          />
        ))}
      </div>
      <Send page={page} sendable={sendable} onProblem={onProblem} />
    </div>
  );
}

// Send the version with the most votes, or why it cannot go yet, or where
// it went.
function Send({
  page,
  sendable,
  onProblem,
}: Readonly<{ page: IdeaPage; sendable: boolean; onProblem: OnProblem }>) {
  const { t } = useTranslation("explore");
  const [busy, setBusy] = useState(false);
  const line = sendLine(page, sendable);
  const send = async () => {
    if (!line.version) return;
    setBusy(true);
    onProblem(null);
    try {
      await post("/api/explore/send", {
        idea: page.idea.id,
        version: line.version,
      });
    } catch (error) {
      onProblem(messageOf(error));
    }
    setBusy(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3">
      <span
        className={cn(
          "flex-1 text-body text-muted-foreground",
          !line.button && !line.connect && "font-medium text-foreground",
        )}
      >
        {line.words}
      </span>
      {line.connect && (
        <Button asChild variant="outline">
          <a href="#settings">{t("send.connect")}</a>
        </Button>
      )}
      {line.button && (
        <Button disabled={!line.version || busy} onClick={() => void send()}>
          {line.button}
        </Button>
      )}
    </div>
  );
}

function NoVersions({ page }: Readonly<{ page: IdeaPage }>) {
  const { t } = useTranslation("explore");
  const discard = () => {
    if (!window.confirm(t("none.confirm", { title: page.idea.title }))) return;
    void post("/api/explore/discard", { idea: page.idea.id }).then(() => {
      window.location.hash = exploreHash();
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3">
      <span className="flex-1 text-body text-muted-foreground">
        {page.unshared > 0
          ? t("none.unshared", { count: page.unshared })
          : t("none.nothing")}
      </span>
      {page.unshared === 0 && page.tickets.length === 0 && (
        <Button variant="ghost" size="sm" onClick={discard}>
          {t("none.discard")}
        </Button>
      )}
      <Button asChild size="sm">
        <a href={prototypeHash(page.idea.id)}>{t("none.make")}</a>
      </Button>
    </div>
  );
}
