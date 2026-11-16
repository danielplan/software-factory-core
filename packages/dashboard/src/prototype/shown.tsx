// What prototype mode shows: the version running in a frame, at the address
// its start command said, or Main, the product as it runs today; otherwise
// why not, with Start. Below it, which version it is and who made it, and
// Stop while it runs.

import { messageOf, post, type PartView, type PrototypePage } from "@/api";
import { Button } from "@/components/ui/button";
import {
  madeWords,
  mainOf,
  runWords,
  stillWords,
  versionTitle,
} from "@/explore/view";

type Version = PrototypePage["versions"][number];
type Run = Version["run"];
type Press = (path: string) => () => void;

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
      className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 bg-surface p-4"
    >
      {url ? (
        <iframe
          title={versionTitle(version)}
          src={url}
          className="h-full w-full rounded-xl border bg-card shadow-soft"
        />
      ) : (
        <Still
          words={version && run ? stillWords(page, run) : main.words}
          canStart={page.canRun && run !== null && startable(run)}
          onStart={press("/api/prototypes/start")}
        />
      )}
      {version && run && (
        <Caption version={version} run={run} url={url} press={press} />
      )}
      {!version && (
        <p className="text-sm">
          <b>Main</b>{" "}
          <span className="text-muted-foreground">
            the product as it runs today
          </span>
        </p>
      )}
    </section>
  );
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
}: Readonly<{ words: string; canStart: boolean; onStart: () => void }>) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed bg-card p-6">
      <div className="grid max-w-md justify-items-center gap-3 text-center">
        <p className="text-sm">{words}</p>
        {canStart && <Button onClick={onStart}>Start it</Button>}
      </div>
    </div>
  );
}

function Caption({
  version,
  run,
  url,
  press,
}: Readonly<{ version: Version; run: Run; url: string | null; press: Press }>) {
  const runs = run.state === "running" || run.state === "starting";
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <b>{versionTitle(version)}</b>
      <span className="text-muted-foreground">
        {version.branch} · {madeWords(version.madeBy)} · {runWords(run)}
      </span>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Open in its own window
        </a>
      )}
      {runs && (
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={press("/api/prototypes/stop")}
        >
          Stop it
        </Button>
      )}
    </p>
  );
}
