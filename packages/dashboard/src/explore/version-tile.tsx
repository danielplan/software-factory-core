// A version of an idea, everything about it on one card: its picture when
// someone made one, its letter and name, what it is doing when it is not
// stopped, Try it (starts it in prototype mode and opens it there) and the
// vote (one per person per idea; voting again takes it back), with how
// many voted for it and, on the one ahead, "Most votes".

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { post, type VersionCard, type VersionRun } from "@/api";
import { Button } from "@/components/ui/button";
import { prototypeHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { runWords, voteWords } from "./view";

type OnProblem = (problem: string | null) => void;

export function VersionTile({
  version,
  run,
  ahead,
  onProblem,
}: Readonly<{
  version: VersionCard;
  run: VersionRun;
  // It has the most votes, and no other as many.
  ahead: boolean;
  onProblem: OnProblem;
}>) {
  const { t } = useTranslation("explore");
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
  const vote = () => {
    onProblem(null);
    post("/api/explore/pick", asked).catch((error: unknown) => {
      onProblem(error instanceof Error ? error.message : String(error));
    });
  };
  return (
    <div
      className={cn(
        "grid content-start overflow-hidden rounded-xl border bg-card transition-[box-shadow,border-color] hover:shadow-lift",
        version.mine && "border-primary/50 ring-1 ring-primary/30",
      )}
    >
      {version.thumbnail && (
        <img
          src={version.thumbnail}
          alt={t("version.picture", { version: version.key })}
          className="h-36 w-full bg-surface object-cover object-top"
        />
      )}
      <div className="grid gap-3 p-3.5">
        <div className="flex items-start gap-2">
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-item">
              <b className="font-semibold">{version.key}</b> · {version.name}
            </span>
            {run.state !== "stopped" && (
              <span
                className={cn(
                  "text-tag text-muted-foreground",
                  run.state === "running" && "font-medium text-success",
                )}
              >
                {runWords(run)}
              </span>
            )}
          </span>
          {ahead && (
            <span className="flex-none rounded-full bg-solving px-2 py-0.5 text-tag font-semibold text-solving-foreground">
              {t("version.most")}
            </span>
          )}
        </div>
        <TileActions version={version} onTry={tryIt} onVote={vote} />
      </div>
    </div>
  );
}

// Try it at the left; how many voted and the vote at the right.
function TileActions({
  version,
  onTry,
  onVote,
}: Readonly<{
  version: VersionCard;
  onTry: () => void;
  onVote: () => void;
}>) {
  const { t } = useTranslation("explore");
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onTry}>
        {t("version.try")}
      </Button>
      <span className="ml-auto text-tag text-muted-foreground">
        {voteWords(version.picks)}
      </span>
      <Button
        variant={version.mine ? "default" : "outline"}
        size="sm"
        aria-pressed={version.mine}
        onClick={onVote}
      >
        {version.mine ? (
          <>
            <Check aria-hidden />
            {t("version.yourVote")}
          </>
        ) : (
          t("version.vote")
        )}
      </Button>
    </div>
  );
}
