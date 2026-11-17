// The Signals page's list: the new stories the kobold wrote, then each new
// thing people said, with an icon for its kind, the words (two lines at
// most) and where and when it came from; the one shown is lit.

import {
  Bug,
  CircleHelp,
  type LucideIcon,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type { KoboldNews, SignalView } from "@/api";
import { understandHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { KoboldMark } from "@/understand/bits";

import { kindOf, type SignalKind, signalsHash } from "./view";

export const KIND: Record<SignalKind, { icon: LucideIcon; tone: string }> = {
  bug: { icon: Bug, tone: "bg-destructive/10 text-destructive" },
  need: { icon: Sparkles, tone: "bg-build/10 text-build" },
  update: { icon: RefreshCw, tone: "bg-explore/12 text-explore" },
  question: { icon: CircleHelp, tone: "bg-understand/10 text-understand" },
  other: { icon: MessageSquare, tone: "bg-surface-2 text-foreground-2" },
};

export function SignalList({
  news,
  shown,
  personaName,
}: Readonly<{
  news: KoboldNews;
  shown: string | null;
  personaName: (id: string) => string;
}>) {
  const { t } = useTranslation("understand");
  if (news.toLookAt.length === 0 && news.newStories.length === 0)
    return (
      <div className="grid justify-items-center gap-3 rounded-[18px] bg-card px-5 py-10 text-center shadow-soft">
        <KoboldMark className="size-12" />
        <p className="text-body text-muted-foreground">{t("signals.empty")}</p>
      </div>
    );
  return (
    <nav
      aria-label={t("signals.list")}
      className="grid content-start gap-1 rounded-[18px] bg-card p-2 shadow-soft"
    >
      {news.newStories.map((story) => (
        <a
          key={story.id}
          href={understandHash(story.persona, story.id)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-hover"
        >
          <KoboldMark className="size-7" />
          <span className="min-w-0 flex-1 text-note text-foreground-2">
            {t("signals.newStory", {
              name: personaName(story.persona),
              title: story.title,
            })}
          </span>
        </a>
      ))}
      {news.toLookAt.map((signal) => (
        <Row key={signal.id} signal={signal} lit={signal.id === shown} />
      ))}
    </nav>
  );
}

function Row({ signal, lit }: Readonly<{ signal: SignalView; lit: boolean }>) {
  const { t } = useTranslation("understand");
  const kind = kindOf(signal);
  const { icon: Icon, tone } = KIND[kind];
  const from = [signal.sourceName, signal.when].filter(Boolean).join(" · ");
  return (
    <a
      href={signalsHash(signal.id)}
      aria-current={lit ? "true" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-hover",
        lit && "bg-tint ring-1 ring-tint-line hover:bg-tint",
      )}
    >
      <span
        title={t(`signals.kind.${kind}`)}
        className={cn(
          "mt-0.5 grid size-7 flex-none place-items-center rounded-lg",
          tone,
        )}
      >
        <Icon aria-hidden className="size-3.5" />
        <span className="sr-only">{t(`signals.kind.${kind}`)}</span>
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="line-clamp-2 text-item">{signal.text}</span>
        <span className="truncate text-note text-muted-foreground">{from}</span>
      </span>
    </a>
  );
}
