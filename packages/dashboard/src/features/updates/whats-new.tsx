// What's new in Kobble (Settings › Updates): the release this factory runs
// and the ones before it, from the files on this computer, and a newer one
// on its way when GitHub says so. Each release opens and closes; each
// change has its tag, its bold title, the first sentence and More.

import { ChevronDown, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { get, onKobbleChanged, post } from "@/api/client";
import { Markdown } from "@/components/markdown";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { messagesIn } from "@/i18n/messages";
import { useLanguage } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

import { compareVersions } from "../../../../core/src/version.ts";
import type { WhatsNewView } from "../../../../server/src/updates/whats-new.ts";
import { ago, shownChange, showsNewer } from "./whats-new-model";

type Words = ReturnType<typeof messagesIn>["whatsNew"];
type Release = WhatsNewView["releases"][number];

const KIND_LOOK = {
  New: "bg-[color:var(--solved)] text-[color:var(--solved-foreground)]",
  Changed: "bg-[color:var(--build)]/10 text-[color:var(--build)]",
  Fixed: "bg-[color:var(--explore)]/15 text-[#8a5a00]",
};

export function WhatsNew() {
  const { locale } = useLanguage();
  const m = messagesIn(locale).whatsNew;
  const [view, setView] = useState<WhatsNewView | null>(null);
  const [trying, setTrying] = useState(false);
  const [failed, setFailed] = useState(false);
  const path = `/api/updates/whats-new?language=${locale}`;
  const load = useCallback(() => {
    get<WhatsNewView>(path).then(
      (next) => {
        setView(next);
        setFailed(false);
      },
      () => {
        setFailed(true);
      },
    );
  }, [path]);
  useEffect(() => {
    load();
    return onKobbleChanged(load);
  }, [load]);
  const tryAgain = () => {
    setTrying(true);
    post("/api/updates/look")
      .catch(() => undefined)
      .finally(() => {
        setTrying(false);
        load();
      });
  };
  if (failed && !view)
    return <p className="text-[13px] text-muted-foreground">{m.problem}</p>;
  if (!view) return null;
  const newer = showsNewer(view.newest, view.current, compareVersions)
    ? view.newest
    : null;
  return (
    <div className="grid gap-3">
      <Status view={view} m={m} trying={trying} onTryAgain={tryAgain} />
      {view.problem && (
        <p className="text-[13px] text-muted-foreground">{m.problem}</p>
      )}
      <div role="list" aria-label={m.releases} className="grid gap-2">
        {newer && (
          <div role="listitem">
            <Release
              m={m}
              version={newer.version}
              release={newer.release}
              kind="newer"
              open
            />
          </div>
        )}
        {view.releases.map((release, index) => (
          <div role="listitem" key={release.version}>
            <Release
              m={m}
              version={release.version}
              release={release}
              kind={release.version === view.current ? "yours" : "older"}
              open={index === 0 && !newer}
            />
          </div>
        ))}
      </div>
      {view.releases.length === 0 && !view.problem && !newer && (
        <p className="text-[13px] text-muted-foreground">{m.empty}</p>
      )}
    </div>
  );
}

// "You're on Kobble 0.13.2", and, when GitHub could not be asked, a calm
// grey note with when it last tried and Try again.
function Status({
  view,
  m,
  trying,
  onTryAgain,
}: Readonly<{
  view: WhatsNewView;
  m: Words;
  trying: boolean;
  onTryAgain: () => void;
}>) {
  const { locale } = useLanguage();
  return (
    <p
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground"
      aria-live="polite"
    >
      <span className="font-medium text-foreground">
        {m.youAre(view.current)}
      </span>
      {view.offline && (
        <>
          <span>· {m.offline}</span>
          {view.checkedAt && (
            <span>· {m.checked(ago(locale, view.checkedAt))}</span>
          )}
        </>
      )}
      {view.offline && (
        <button
          type="button"
          disabled={trying}
          onClick={onTryAgain}
          className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2 disabled:no-underline"
        >
          <RefreshCw
            aria-hidden
            className={cn("size-3.5", trying && "animate-spin")}
          />
          {trying ? m.trying : m.tryAgain}
        </button>
      )}
    </p>
  );
}

function Release({
  m,
  version,
  release,
  kind,
  open,
}: Readonly<{
  m: Words;
  version: string;
  release: Release | null;
  kind: "newer" | "yours" | "older";
  open: boolean;
}>) {
  const [isOpen, setOpen] = useState(open);
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setOpen}
      className="rounded-xl border border-border bg-card"
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] font-medium">
        <span className="min-w-0 flex-1">
          {kind === "newer" ? m.onItsWay(version) : version}
          {release?.date && (
            <span className="ml-2 font-normal text-muted-foreground">
              {release.date}
            </span>
          )}
        </span>
        {kind === "newer" && (
          <span className="shimmer rounded-full px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground">
            {m.arrives}
          </span>
        )}
        {kind === "yours" && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground">
            {m.yours}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className="size-4 flex-none text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        aria-label={m.changesOf(version)}
        className="collapsible-content overflow-hidden"
      >
        {release ? (
          <ul className="grid gap-2.5 px-3 pb-3">
            {release.changes.map((change, index) => (
              <Change
                key={`${change.title}-${String(index)}`}
                m={m}
                change={change}
                index={index}
              />
            ))}
          </ul>
        ) : (
          <p className="px-3 pb-3 text-[13px] text-muted-foreground">
            {m.noWords}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Change({
  m,
  change,
  index,
}: Readonly<{
  m: Words;
  change: Release["changes"][number];
  index: number;
}>) {
  const [more, setMore] = useState(false);
  const shown = shownChange(change);
  return (
    <li
      className="animate-fade-in text-[13px] leading-relaxed"
      style={{ animationDelay: `${String(Math.min(index, 8) * 40)}ms` }}
    >
      <span
        className={cn(
          "mr-2 inline-block rounded-md px-1.5 py-px text-[11.5px] font-semibold",
          KIND_LOOK[change.kind],
        )}
      >
        {m.kinds[change.kind]}
      </span>
      <span className="font-semibold">
        <Markdown text={shown.title} inline />
      </span>{" "}
      <Markdown text={shown.first} inline />
      {shown.rest && (
        <>
          {" "}
          <button
            type="button"
            aria-expanded={more}
            onClick={() => {
              setMore(!more);
            }}
            className="font-medium text-primary underline underline-offset-2"
          >
            {more ? m.less : m.more}
          </button>
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
              more
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden text-muted-foreground">
              <div className="pt-1">
                <Markdown text={shown.rest} />
              </div>
            </div>
          </div>
        </>
      )}
    </li>
  );
}
