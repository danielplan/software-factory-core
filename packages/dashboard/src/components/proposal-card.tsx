// Something a kobold proposes to do, as its own card under its reply (as
// Coval shows a change): a head that says what will happen, the thing
// itself exactly as its page will show it, and a strip with the decision.
// While it waits: the action and Change something, and a quiet "waiting for
// you". Afterwards: what became of it, with a way to it, or that it was not
// done (the card fades). Any proposal uses it: a persona to add, a mission
// to send, and what comes next.

import { Check, ChevronRight, PencilLine } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Decision =
  | {
      state: "waiting";
      action: string;
      icon?: ReactNode;
      onAct: () => void;
      onChange: () => void;
    }
  | { state: "done"; said: string; to?: { href: string; label: string } }
  | { state: "dropped"; said: string }
  // Shown only, while the answer is still being written.
  | { state: "shown" };

export function ProposalCard({
  icon,
  title,
  decision,
  children,
}: Readonly<{
  icon: ReactNode;
  title: string;
  decision: Decision;
  children: ReactNode;
}>) {
  const t = useTranslation().t;
  return (
    <figure
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border-soft bg-background shadow-card transition-opacity duration-300 motion-safe:animate-rise",
        decision.state === "dropped" && "opacity-60",
      )}
    >
      <figcaption className="flex items-center gap-2 border-b border-border-soft px-3.5 py-2.5 text-[12.5px] font-medium">
        <span className="flex size-6 flex-none items-center justify-center rounded-lg bg-blue/10 text-blue [&_svg]:size-3.5">
          {icon}
        </span>
        {title}
        {decision.state === "waiting" && (
          <span className="ml-auto flex items-center gap-1.5 text-[11.5px] font-normal text-muted-foreground">
            <span className="size-1.5 rounded-full bg-blue motion-safe:animate-breathe" />
            {t("support.proposal.waiting")}
          </span>
        )}
      </figcaption>
      <div className="p-3">{children}</div>
      {decision.state !== "shown" && (
        <div className="flex min-h-11 items-center gap-1.5 border-t border-border-soft bg-surface/60 px-3.5 py-2 text-[12.5px]">
          <Strip decision={decision} />
        </div>
      )}
    </figure>
  );
}

function Strip({
  decision,
}: Readonly<{ decision: Exclude<Decision, { state: "shown" }> }>) {
  const t = useTranslation().t;
  if (decision.state === "waiting")
    return (
      <>
        <Button size="pill-sm" onClick={decision.onAct}>
          {decision.icon ?? <Check aria-hidden />}
          {decision.action}
        </Button>
        <Button size="pill-sm" variant="ghost" onClick={decision.onChange}>
          <PencilLine aria-hidden />
          {t("support.proposal.change")}
        </Button>
      </>
    );
  if (decision.state === "dropped")
    return <span className="text-muted-foreground">{decision.said}</span>;
  return (
    <>
      <span className="flex items-center gap-1.5 text-muted-foreground [&_svg]:size-3.5">
        <Check aria-hidden className="text-blue" />
        {decision.said}
      </span>
      {decision.to && (
        <a
          href={decision.to.href}
          className="ml-auto flex items-center gap-0.5 rounded-full px-2 py-0.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground [&_svg]:size-3.5"
        >
          {decision.to.label}
          <ChevronRight aria-hidden />
        </a>
      )}
    </>
  );
}
