// Releases: the coming release on top (what was merged since the last one,
// the number the kobold suggests and why, with Release now beside the
// title), the past releases below, newest first, each folding open to show
// its notes. Releases are tags and releases on the connected GitHub
// repository, so nothing is kept in the factory.

import { LoaderCircle } from "lucide-react";

import type { ReleasesView } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { useT } from "@/i18n/use-t";
import { type Read, useRead } from "@/lib/use-read";

import { ComingRelease } from "./coming-release";
import { PastReleases } from "./past-releases";
import { shownOf } from "./view";

export function ReleasesPage() {
  const t = useT();
  const shown = shownOf(useRead("/api/releases") as Read<ReleasesView>);
  return (
    <>
      <PageHead title={t.shell.pages.releases} about={t.releases.about} />
      {shown.state === "loading" && (
        <p
          role="status"
          className="flex items-center gap-2 text-[13px] text-muted-foreground"
        >
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          {t.releases.reading}
        </p>
      )}
      {shown.state === "problem" && (
        <ProblemBox title={t.releases.couldNotRead} text={shown.text} />
      )}
      {shown.state === "no-repository" && (
        <ProblemBox
          title={t.releases.needsRepository.title}
          text={`${t.releases.needsRepository.text} [${t.releases.needsRepository.link}](#settings)`}
        />
      )}
      {shown.state === "ready" && (
        <>
          <ComingRelease view={shown.view} />
          <PastReleases past={shown.view.past} />
        </>
      )}
    </>
  );
}
