import type { Status } from "@/lib/voice/status-line";
import { useT } from "@/i18n/use-t";

// The line under the glow: what is happening, or what went wrong, in plain
// words; while a speech model is on its way, a thin bar with how far it is.
export function VoiceStatus({
  status,
  moment,
}: Readonly<{ status: Status; moment: string }>) {
  const t = useT();
  const percent =
    status.progress === undefined ? null : Math.round(status.progress * 100);
  return (
    <div className="grid w-full justify-items-center gap-2">
      <p
        role="status"
        className={
          status.problem
            ? "text-center text-[13px] text-destructive"
            : "text-center text-xs font-medium text-muted-foreground"
        }
      >
        {status.text || moment}
      </p>
      {percent !== null && (
        <div
          role="progressbar"
          aria-label={t.voice.gettingModel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1 w-full max-w-60 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${String(percent)}%` }}
          />
        </div>
      )}
    </div>
  );
}
