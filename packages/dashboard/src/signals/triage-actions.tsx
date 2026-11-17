// What a person does with the signal shown, in one click: Fix (straight to
// Build as a bug), Explore (a new idea from its story) — or "Add to" the
// idea already explored for its problem — and Dismiss. Looking right and
// moving it elsewhere are in a small "⋯" menu.

import { Ellipsis } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useTranslation } from "react-i18next";

import type { SignalView } from "@/api";
import { FixTicketFor } from "@/build/fix-ticket";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { newIdeaHash } from "@/lib/routes";
import {
  agreeWith,
  canAgree,
  move,
  NoBoard,
  storyOf,
  useActs,
} from "@/understand/signal-actions";
import { alreadyOf } from "@/understand/view";

import { type Triage, triageOf } from "./view";

export function TriageActions({
  signal,
  onMove,
}: Readonly<{ signal: SignalView; onMove: () => void }>) {
  const acts = useActs(signal);
  const already = alreadyOf(signal);
  const triage = triageOf(
    signal.went?.to,
    canAgree(signal),
    already?.kind === "explored" ? already.idea : null,
  );
  const explore = newIdeaHash(storyOf(signal));
  const agree = () => void acts.run(() => agreeWith(signal.id));
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Main
          signal={signal}
          triage={triage}
          explore={explore}
          acts={acts}
          onAgree={agree}
        />
        <More
          explore={triage.addTo ? explore : null}
          onAgree={triage.agreeInMenu ? agree : null}
          onMove={onMove}
        />
        <FixTicketFor signal={signal} />
      </div>
      {acts.noBoard && <NoBoard />}
      {acts.problem && <Problem text={acts.problem} />}
    </div>
  );
}

function Problem({ text }: Readonly<{ text: string }>) {
  const { t } = useTranslation("understand");
  return <ProblemBox title={t("signal.didntWork")} text={text} />;
}

// Fix, Explore (or Add to the idea), Dismiss.
function Main({
  signal,
  triage,
  explore,
  acts,
  onAgree,
}: Readonly<{
  signal: SignalView;
  triage: Triage;
  explore: string;
  acts: ReturnType<typeof useActs>;
  onAgree: () => void;
}>) {
  const { t } = useTranslation("understand");
  const { busy, run, fix } = acts;
  return (
    <>
      {triage.fix && (
        <Button disabled={busy} onClick={() => void fix()}>
          {busy ? t("signal.sending") : t("signal.fix")}
        </Button>
      )}
      {triage.addTo ? (
        <Button variant="outline" disabled={busy} onClick={onAgree}>
          {t("signal.addTo", { title: triage.addTo.title })}
        </Button>
      ) : (
        <Button asChild variant="outline">
          <a href={explore}>{t("signal.explore")}</a>
        </Button>
      )}
      {triage.dismiss && (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void run(() => move(signal.id, "answered"))}
        >
          {t("signal.dismiss")}
        </Button>
      )}
    </>
  );
}

// The rest, in a small menu: looks right, explore (when adding to an idea
// came first), move it elsewhere.
function More({
  explore,
  onAgree,
  onMove,
}: Readonly<{
  explore: string | null;
  onAgree: (() => void) | null;
  onMove: () => void;
}>) {
  const { t } = useTranslation("understand");
  const item =
    "flex cursor-pointer items-center rounded-md px-2.5 py-1.5 text-body outline-none data-highlighted:bg-hover";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("signals.more")}>
          <Ellipsis aria-hidden />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 grid min-w-44 gap-0.5 rounded-xl bg-popover p-1.5 text-popover-foreground shadow-[0_0_0_1px_var(--border),var(--shadow-big)]"
        >
          {onAgree && (
            <DropdownMenu.Item className={item} onSelect={onAgree}>
              {t("signal.looksGood")}
            </DropdownMenu.Item>
          )}
          {explore && (
            <DropdownMenu.Item asChild className={item}>
              <a href={explore}>{t("signal.explore")}</a>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={item} onSelect={onMove}>
            {t("signal.move")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
