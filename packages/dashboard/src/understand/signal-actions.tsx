// What a person does with something people said, in one click: Fix (it
// goes straight to Build as a bug, and becomes a card there when a GitHub
// board is connected), Explore (a new idea from its story) or Dismiss
// (nothing to do). Above them, what already exists for its problem; when an
// idea is already being explored, agreeing with where it is reads "Add to"
// that idea. Moving it elsewhere stays, quieter.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post, type SignalView } from "@/api";
import { FixTicketFor } from "@/build/fix-ticket";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { newIdeaHash } from "@/lib/routes";

import { alreadyOf, alreadyWords } from "./view";

const move = (signal: string, to: "build" | "answered") =>
  post("/api/understand/move", { signal, to: { to } });

// `quiet` leaves out the line of what already exists, for a page that
// shows it its own way (Signals).
export function SignalActions({
  signal,
  moving,
  onMove,
  quiet = false,
}: Readonly<{
  signal: SignalView;
  moving: boolean;
  onMove: () => void;
  quiet?: boolean;
}>) {
  const { t } = useTranslation("understand");
  const { busy, problem, setProblem, noBoard, run, fix } = useActs(signal);
  const already = alreadyOf(signal);
  const went = signal.went?.to;
  return (
    <div className="grid gap-2 pt-0.5">
      {already && !quiet && (
        <p className="text-note font-medium text-foreground-2">
          {alreadyWords(already)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {went !== "build" && went !== "ticket" && (
          <Button size="xs" disabled={busy} onClick={() => void fix()}>
            {busy ? t("signal.sending") : t("signal.fix")}
          </Button>
        )}
        <Button asChild variant="outline" size="xs">
          <a href={newIdeaHash(went === "story" ? storyOf(signal) : undefined)}>
            {t("signal.explore")}
          </a>
        </Button>
        {went !== "answered" && (
          <Button
            variant="ghost"
            size="xs"
            disabled={busy}
            onClick={() => void run(() => move(signal.id, "answered"))}
          >
            {t("signal.dismiss")}
          </Button>
        )}
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        <Agree signal={signal} already={already} onProblem={setProblem} />
        <Button
          variant="ghost"
          size="xs"
          aria-expanded={moving}
          onClick={onMove}
          className="text-muted-foreground"
        >
          {t("signal.move")}
        </Button>
        <FixTicketFor signal={signal} />
      </div>
      {noBoard && <NoBoard />}
      {problem && <ProblemBox title={t("signal.didntWork")} text={problem} />}
    </div>
  );
}

// Doing one of the actions: busy while it goes, what went wrong, and
// whether a fix stayed without a card (no board to take it).
function useActs(signal: SignalView) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [noBoard, setNoBoard] = useState(false);
  const run = async (act: () => Promise<unknown>) => {
    setBusy(true);
    setProblem(null);
    try {
      await act();
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setBusy(false);
    }
  };
  // Sent to Build first; the card only when a board can take it.
  const fix = () =>
    run(async () => {
      await move(signal.id, "build");
      await post("/api/build/fix", { signal: signal.id }).catch(() => {
        setNoBoard(true);
      });
    });
  return { busy, problem, setProblem, noBoard, run, fix };
}

function storyOf(signal: SignalView): string | undefined {
  return signal.went?.to === "story" ? signal.went.story : undefined;
}

// Agreeing with where the kobold put it: "Add to" an idea being explored
// for its problem, else "Looks right".
function Agree({
  signal,
  already,
  onProblem,
}: Readonly<{
  signal: SignalView;
  already: ReturnType<typeof alreadyOf>;
  onProblem: (problem: string | null) => void;
}>) {
  const { t } = useTranslation("understand");
  if (signal.went === null || signal.by !== "kobold") return null;
  const agree = () => {
    onProblem(null);
    post("/api/understand/looks-good", { signal: signal.id }).catch(
      (error: unknown) => {
        onProblem(messageOf(error));
      },
    );
  };
  return (
    <Button variant="outline" size="xs" onClick={agree}>
      {already?.kind === "explored"
        ? t("signal.addTo", { title: already.idea.title })
        : t("signal.looksGood")}
    </Button>
  );
}

function NoBoard() {
  const { t } = useTranslation("understand");
  return (
    <p className="flex flex-wrap items-center gap-2 text-note text-muted-foreground">
      {t("signal.sentNoBoard")}
      <a
        href="#settings"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("signal.openSettings")}
      </a>
    </p>
  );
}
