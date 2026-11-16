// A version of an idea on Explore: its picture when someone made one, its
// letter and name, phone or desktop, whether it runs on this computer, Try
// it (starts it in prototype mode and opens it there) and Pick (one pick
// per person per idea; pressing it again takes it back).

import { Monitor, Smartphone } from "lucide-react";

import { post, type VersionCard, type VersionRun } from "@/api";
import { Button } from "@/components/ui/button";
import { prototypeHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { pickWords, runWords } from "./view";

export function VersionTile({
  version,
  run,
  onProblem,
}: Readonly<{
  version: VersionCard;
  run: VersionRun;
  onProblem: (problem: string | null) => void;
}>) {
  const asked = { idea: version.idea, version: version.key };
  const tryIt = () => {
    onProblem(null);
    // Prototype mode says how it goes, or why it cannot start.
    void post("/api/prototypes/start", asked)
      .catch(() => undefined)
      .then(() => {
        window.location.hash = prototypeHash(version.idea, version.key);
      });
  };
  const pick = () => {
    onProblem(null);
    post("/api/explore/pick", asked).catch((error: unknown) => {
      onProblem(error instanceof Error ? error.message : String(error));
    });
  };
  return (
    <div
      className={cn(
        "grid content-start overflow-hidden rounded-2xl border bg-card",
        version.mine && "ring-2 ring-foreground",
      )}
    >
      {version.thumbnail && (
        <img
          src={version.thumbnail}
          alt={`Version ${version.key}`}
          className="h-44 w-full bg-surface object-cover object-top"
        />
      )}
      <div className="grid gap-2.5 px-4 py-3">
        <p className="text-[15px]">
          <b>{version.key}</b> · {version.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {version.surface === "phone" ? (
              <Smartphone className="size-3.5" aria-hidden />
            ) : (
              <Monitor className="size-3.5" aria-hidden />
            )}
            {version.surface === "phone" ? "Phone" : "Desktop"}
          </span>
          <span
            className={cn(
              run.state === "running" && "font-medium text-success",
            )}
          >
            {runWords(run)}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={tryIt}>
            Try it
          </Button>
          <span className="flex-1 text-right text-xs text-muted-foreground">
            {pickWords(version.picks)}
          </span>
          <Button
            variant={version.mine ? "default" : "outline"}
            size="sm"
            aria-pressed={version.mine}
            onClick={pick}
          >
            {version.mine ? "Picked" : "Pick"}
          </Button>
        </div>
      </div>
    </div>
  );
}
