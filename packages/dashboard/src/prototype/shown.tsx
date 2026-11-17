// What prototype mode shows, in a big card floating on the canvas: the
// version running in a frame, at the address its start command said, or
// Main, the product as it runs today; otherwise, calmly, why not, with Start
// when it can start. Its footer says which version it is and who made it,
// with Stop while it runs. It fades in when the version changes.

import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { messageOf, post, type PartView, type PrototypePage } from "@/api";
import { Button } from "@/components/ui/button";
import {
  madeWords,
  mainOf,
  runWords,
  stillWords,
  versionTitle,
} from "@/explore/view";
import { t } from "@/i18n/i18n";
import { KoboldMark } from "@/understand/bits";

type Version = PrototypePage["versions"][number];
type Run = Version["run"];
type Press = (path: string) => () => void;
type Words = { title: string; more?: string };

export function Shown({
  page,
  version,
  run,
  parts,
  onProblem,
}: Readonly<{
  page: PrototypePage;
  version: Version | null;
  run: Run | null;
  parts: PartView[];
  onProblem: (problem: string | null) => void;
}>) {
  const main = mainOf(parts);
  const url = version && run ? runningAt(run) : main.url;
  const press: Press = (path) => () => {
    onProblem(null);
    post(path, { idea: page.idea.id, version: version?.key }).catch(
      (error: unknown) => {
        onProblem(messageOf(error));
      },
    );
  };
  return (
    <section
      aria-label={versionTitle(version)}
      className="grid min-h-[70dvh] animate-enter grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[22px] bg-card shadow-float lg:min-h-0"
    >
      {url ? (
        <div className="p-2 pb-0">
          <iframe
            title={versionTitle(version)}
            src={url}
            className="h-full w-full rounded-[16px] bg-card ring-1 ring-line-soft"
          />
        </div>
      ) : (
        <Still
          words={stillOf(page, version, run, main.words)}
          canStart={page.canRun && run !== null && startable(run)}
          onStart={press("/api/prototypes/start")}
        />
      )}
      <Footer version={version} run={run} url={url} press={press} />
    </section>
  );
}

function stillOf(
  page: PrototypePage,
  version: Version | null,
  run: Run | null,
  main: string,
): Words {
  if (!version || !run) return { title: main };
  // The project has no prototype command: said in plain words.
  if (!page.canRun)
    return {
      title: t("explore:still.cannotRun"),
      more: t("explore:still.cannotRunMore"),
    };
  return { title: stillWords(page, run) };
}

function runningAt(run: Run): string | null {
  return run.state === "running" ? run.url : null;
}

function startable(run: Run): boolean {
  return run.state === "stopped" || run.state === "failed";
}

// Why nothing is shown, and Start when it can start.
function Still({
  words,
  canStart,
  onStart,
}: Readonly<{ words: Words; canStart: boolean; onStart: () => void }>) {
  const { t } = useTranslation("explore");
  return (
    <div className="grid place-items-center p-8">
      <div className="grid max-w-sm justify-items-center gap-3 text-center">
        <KoboldMark className="size-12" />
        <p className="text-item">{words.title}</p>
        {words.more && (
          <p className="text-note text-muted-foreground">{words.more}</p>
        )}
        {canStart && <Button onClick={onStart}>{t("shown.start")}</Button>}
      </div>
    </div>
  );
}

// Which version it is, in a short line, and what can be done with it.
function Footer({
  version,
  run,
  url,
  press,
}: Readonly<{
  version: Version | null;
  run: Run | null;
  url: string | null;
  press: Press;
}>) {
  const { t } = useTranslation("explore");
  const runs = run?.state === "running" || run?.state === "starting";
  return (
    <footer className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border-soft px-5 py-3 text-body">
      <b className="font-semibold">{versionTitle(version)}</b>
      <span className="text-muted-foreground">
        {version && run
          ? `${madeWords(version.madeBy)} · ${runWords(run)}`
          : t("shown.mainAbout")}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {url && (
          <Button asChild variant="ghost" size="sm">
            <a href={url} target="_blank" rel="noreferrer">
              {t("shown.window")}
              <ExternalLink aria-hidden />
            </a>
          </Button>
        )}
        {runs && (
          <Button
            variant="outline"
            size="sm"
            onClick={press("/api/prototypes/stop")}
          >
            {t("shown.stop")}
          </Button>
        )}
      </span>
    </footer>
  );
}
