// Variant F: the Feedback page, under "Send feedback" in the sidebar. What
// this person sent to the public feedback board and where each stands
// (sent, seen, planned, done); a button sends new feedback, in Sprocket's
// window. PROTOTYPE: English only; the posts are made up.

import { Bug, ExternalLink, Lightbulb, MessageSquarePlus } from "lucide-react";

import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";

import { BOARD, BOARD_URL, issueUrl, type State, useMine } from "./feedback-board";
import { StatePill } from "./feedback-row";
import { invite } from "./tell-kobold";

const STEPS: State[] = ["sent", "seen", "planned", "done"];

export function FeedbackPage() {
  const t = useT();
  const mine = useMine();
  return (
    <>
      <PageHead
        title={t.shell.pages.feedback}
        about={
          <>
            What you sent to the makers of Kobble, on the public board{" "}
            <a
              href={BOARD_URL}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {BOARD}
            </a>
            , and where each stands.
          </>
        }
        actions={
          <Button
            onClick={() => {
              invite(t.shell.pages.feedback);
            }}
          >
            <MessageSquarePlus aria-hidden />
            Send feedback
          </Button>
        }
      />
      <ul className="grid overflow-hidden rounded-[12px] border border-line-soft bg-card">
        {mine.map((one) => (
          <li key={one.number} className="border-t border-line-soft first:border-t-0">
            <a
              href={issueUrl(one.number)}
              target="_blank"
              rel="noreferrer"
              className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-[13px] hover:bg-surface/60 [&_svg]:size-3.5 [&_svg]:flex-none"
            >
              {one.kind === "bug" ? (
                <Bug aria-hidden className="text-muted-foreground" />
              ) : (
                <Lightbulb aria-hidden className="text-muted-foreground" />
              )}
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="text-faint">#{one.number}</span>
                <span className="truncate">{one.title}</span>
              </span>
              <Progress state={one.state} />
              <ExternalLink aria-hidden className="text-faint" />
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-faint">Made up for this prototype.</p>
    </>
  );
}

// Where a post stands, along sent → seen → planned → done.
function Progress({ state }: Readonly<{ state: State }>) {
  const at = STEPS.indexOf(state);
  return (
    <span className="flex items-center gap-2.5">
      <span className="hidden gap-1 sm:flex" aria-hidden>
        {STEPS.map((step, index) => (
          <span
            key={step}
            className={
              index <= at
                ? "h-1 w-5 rounded-full bg-[#8b8ff0]"
                : "h-1 w-5 rounded-full bg-line-soft"
            }
          />
        ))}
      </span>
      <StatePill state={state} />
    </span>
  );
}
