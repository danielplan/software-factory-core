// Feedback from anywhere in the factory: a row at the bottom of the sidebar
// that opens Sprocket's window, and, when the factory hits an error, a
// notice above it that offers to report it with the details filled in. What
// was sent shows on the Signals page, under Feedback.

import { Flag, MessageSquareHeart, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tile } from "@/components/layout/sidebar-links";
import type { Page } from "@/lib/routes";
import { useT } from "@/i18n/use-t";

import { type CaughtError, putAway, useFreshError } from "./factory-errors";
import { invite, reportError } from "./tell-kobold";

export function FeedbackRow({ current }: Readonly<{ current: Page }>) {
  const all = useT();
  const t = all.feedback;
  const fresh = useFreshError();
  const page = all.shell.pages[current];
  return (
    <>
      {fresh && (
        <ErrorNotice
          error={fresh}
          onReport={() => {
            reportError(fresh, page, t.report);
          }}
        />
      )}
      <SendRow
        onClick={() => {
          invite(page);
        }}
      />
    </>
  );
}

function SendRow({ onClick }: Readonly<{ onClick: () => void }>) {
  const t = useT().feedback;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-strong [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]"
    >
      <Tile color="#667085">
        <MessageSquareHeart aria-hidden />
      </Tile>
      {t.row}
    </button>
  );
}

// The factory just hit an error: offer to report it.
function ErrorNotice({
  error,
  onReport,
}: Readonly<{ error: CaughtError; onReport: () => void }>) {
  const t = useT().feedback;
  return (
    <div className="mb-2 grid gap-2 rounded-[10px] border border-destructive/30 bg-destructive/5 p-3">
      <span className="flex items-start gap-2 text-[13px] leading-snug font-medium text-sidebar-strong [&_svg]:mt-0.5 [&_svg]:size-[14px] [&_svg]:flex-none">
        <TriangleAlert aria-hidden className="text-destructive" />
        <span className="flex-1">{t.hit}</span>
        <button
          type="button"
          aria-label={t.notNow}
          title={t.notNow}
          onClick={putAway}
          className="text-sidebar-muted hover:text-sidebar-strong"
        >
          <X aria-hidden />
        </button>
      </span>
      <span className="line-clamp-2 pl-[22px] font-mono text-[11px] leading-relaxed text-sidebar-muted">
        {error.text}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="mt-0.5 h-7"
        onClick={onReport}
      >
        <Flag aria-hidden />
        {t.report}
      </Button>
    </div>
  );
}
