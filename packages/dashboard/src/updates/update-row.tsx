// Updates in the sidebar, only when something needs the owner (see
// updateRow): changes ready to take, an update running, changes this folder
// cannot take yet, a newer Kobble, or that it just updated. Pressed, it
// opens what there is to know and do: the changes, Update, Look again, and
// preparing the new Kobble as a card for the builder. The "Update by
// itself" switch is in Settings › Updates.

import {
  ArrowDownToLine,
  CircleCheck,
  ExternalLink,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { messageOf, post } from "@/api";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type Read, useRead } from "@/lib/use-read";
import { cn } from "@/lib/utils";

import type { UpdatesView } from "../../../server/src/updates/served.ts";
import {
  type UpdateRow as Row,
  updateRow,
  updatesSummary,
} from "./updates-model";

const ICON: Record<Row["tone"], ReactNode> = {
  busy: <RefreshCw aria-hidden className="animate-spin text-blue" />,
  new: <ArrowDownToLine aria-hidden className="text-blue" />,
  blocked: <TriangleAlert aria-hidden className="text-warning" />,
  release: <Sparkles aria-hidden className="text-blue" />,
  done: <CircleCheck aria-hidden className="text-success" />,
};

const FRAME: Record<Row["tone"], string> = {
  busy: "border-sidebar-border bg-card",
  new: "border-sidebar-border bg-card",
  blocked: "border-warning/40 bg-warning/10",
  release: "border-sidebar-border bg-card",
  done: "border-success/30 bg-success/10",
};

export function UpdateRow() {
  const { data } = useRead("/api/updates") as Read<UpdatesView>;
  const [open, setOpen] = useState(false);
  const row = data ? updateRow(data) : null;
  if (!data || !row) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "mb-1.5 grid w-full gap-0.5 rounded-[10px] border px-3 py-2 text-left hover:brightness-[0.98]",
            FRAME[row.tone],
          )}
        >
          <span className="flex items-center gap-2 text-[13px] font-medium text-sidebar-strong [&_svg]:size-[14px] [&_svg]:flex-none">
            {ICON[row.tone]}
            {row.title}
          </span>
          {row.text && (
            <span className="line-clamp-2 text-xs text-sidebar-muted">
              {row.text}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="grid max-w-[460px] gap-3.5">
        <UpdateDetails data={data} />
      </DialogContent>
    </Dialog>
  );
}

function UpdateDetails({ data }: Readonly<{ data: UpdatesView }>) {
  const [problem, setProblem] = useState<string | null>(null);
  const summary = updatesSummary(data);
  const { release } = data;
  const press = (path: string) => {
    setProblem(null);
    post(path).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  return (
    <>
      <DialogTitle className="text-base font-semibold">
        {summary.title}
      </DialogTitle>
      {summary.text && (
        <div className="text-[13px] text-foreground-2">
          <Markdown text={summary.text} />
        </div>
      )}
      {summary.changes.length > 0 && (
        <ul className="grid rounded-[10px] border border-line-soft text-[13px]">
          {summary.changes.map((change) => (
            <li
              key={change}
              className="border-t border-line-soft px-3 py-2 first:border-t-0"
            >
              {change}
            </li>
          ))}
        </ul>
      )}
      {summary.files.length > 0 && (
        <ul className="text-xs text-muted-foreground">
          {summary.files.map((file) => (
            <li key={file}>
              <code>{file}</code>
            </li>
          ))}
        </ul>
      )}
      {release.newest && (
        <ReleaseBox
          release={release}
          onPrepare={() => {
            press("/api/updates/prepare-release");
          }}
        />
      )}
      {problem && <p className="text-[13px] text-destructive">{problem}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          className="h-8 px-3 text-[13px]"
          disabled={data.looking || data.updating}
          onClick={() => {
            press("/api/updates/look");
          }}
        >
          Look again
        </Button>
        {summary.canUpdate && (
          <Button
            className="h-8 px-3 text-[13px]"
            onClick={() => {
              press("/api/updates/update");
            }}
          >
            Update now
          </Button>
        )}
      </div>
    </>
  );
}

// A newer Kobble: what happens with it, and Prepare the upgrade or the card
// that prepares it.
function ReleaseBox({
  release,
  onPrepare,
}: Readonly<{ release: UpdatesView["release"]; onPrepare: () => void }>) {
  return (
    <div className="grid gap-2 rounded-[10px] bg-surface px-3 py-2.5 text-[13px]">
      <span className="font-medium">Kobble {release.newest} is out</span>
      <span className="text-foreground-2">
        {release.card
          ? "The builder prepares the upgrade on the board. Once its pull request is merged, every computer takes it with its next update."
          : "The builder can prepare the upgrade as a card: the new version, its migrations and the checks, as a pull request for the team to merge."}
      </span>
      {release.card ? (
        <a
          href={release.card.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 justify-self-start text-blue hover:underline"
        >
          Open #{release.card.number}
          <ExternalLink aria-hidden className="size-3" />
        </a>
      ) : (
        <Button
          variant="outline"
          className="h-8 justify-self-start px-3 text-[13px]"
          onClick={onPrepare}
        >
          Prepare the upgrade
        </Button>
      )}
    </div>
  );
}
