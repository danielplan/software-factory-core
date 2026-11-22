// The post's card pinned at the top of the window: while the person talks
// it builds itself (title, what happened, what goes along); after Send it
// is the post's live state.

import { ExternalLink } from "lucide-react";

import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

import { BuildingCard } from "./building-card";
import { issueUrl, type State, useMine } from "@/api/feedback-board";
import type { Thread } from "./tell-kobold";

export function LiveCard({ thread }: Readonly<{ thread: Thread }>) {
  if (thread.step === "sent" && thread.follows != null)
    return <StatusCard number={thread.follows} />;
  return <BuildingCard thread={thread} />;
}

const STEPS: State[] = ["sent", "seen", "planned", "done"];

// After Send: the post's state, live.
function StatusCard({ number }: Readonly<{ number: number }>) {
  const t = useT().feedback;
  const post = useMine().find((one) => one.number === number);
  if (!post) return null;
  const reached = STEPS.indexOf(post.state);
  return (
    <a
      href={issueUrl(post.number)}
      target="_blank"
      rel="noreferrer"
      className="mx-4 mt-1 grid flex-none gap-2.5 rounded-xl border border-line-soft bg-surface/50 px-3.5 py-3 hover:bg-surface motion-safe:animate-rise"
    >
      <span className="flex items-center gap-2 text-[12.5px] [&_svg]:size-3 [&_svg]:flex-none">
        <span className="text-faint">#{post.number}</span>
        <span className="flex-1 truncate font-medium">{post.title}</span>
        <ExternalLink aria-hidden className="text-faint" />
      </span>
      <ol className="grid grid-cols-4 gap-1 text-[10.5px]">
        {STEPS.map((step, at) => (
          <li key={step} className="grid gap-1" title={t.stateHelp[step]}>
            <span
              className={cn(
                "h-1 rounded-full transition-colors duration-700",
                at <= reached ? "bg-[#8b8ff0]" : "bg-line-soft",
                at === reached &&
                  step !== "done" &&
                  "motion-safe:animate-breathe",
              )}
            />
            <span
              className={cn(
                "transition-colors duration-700",
                at <= reached ? "text-foreground-2" : "text-faint",
              )}
            >
              {t.states[step]}
            </span>
          </li>
        ))}
      </ol>
    </a>
  );
}
