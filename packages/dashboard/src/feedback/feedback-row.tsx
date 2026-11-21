// Feedback from anywhere in the factory: a row at the bottom of the sidebar
// that opens a short form. What is written goes to the public feedback
// board, a GitHub repository just for feedback, beside the core's own: the
// form opens GitHub's "new issue" page with it all filled in, under the
// person's own GitHub account. Nothing to host, and the company's code stays
// private. The errors the factory caught go with it, when the person keeps
// them.

import { Bug, ExternalLink, Lightbulb, MessageSquareHeart } from "lucide-react";
import { useState } from "react";

import { CORE_VERSION, RELEASE_SOURCE } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { FIELD_AREA } from "@/lib/field-style";
import type { Page } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/use-t";

import { type CaughtError, useCaughtErrors } from "./factory-errors";
import { Tile } from "@/components/sidebar-links";

type Kind = "bug" | "wish";

// The board: the repository beside the core's, ending in -feedback
// (github:owner/software-factory-core → owner/software-factory-feedback).
const BOARD = `${RELEASE_SOURCE.replace(/^github:/, "").split("/")[0] ?? ""}/software-factory-feedback`;
const BOARD_URL = `https://github.com/${BOARD}/issues`;

export function FeedbackRow({ current }: Readonly<{ current: Page }>) {
  const t = useT().feedback;
  const errors = useCaughtErrors();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-strong [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]"
        >
          <Tile color="#667085">
            <MessageSquareHeart aria-hidden />
          </Tile>
          {t.row}
          {errors.length > 0 && (
            <span
              title={t.caught(errors.length)}
              className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-md bg-destructive/10 px-1.5 text-[11px] font-medium text-destructive"
            >
              {errors.length}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-[520px] gap-4 overflow-y-auto">
        <FeedbackForm
          current={current}
          errors={errors}
          onClose={() => {
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function FeedbackForm({
  current,
  errors,
  onClose,
}: Readonly<{
  current: Page;
  errors: CaughtError[];
  onClose: () => void;
}>) {
  const all = useT();
  const t = all.feedback;
  const [kind, setKind] = useState<Kind>(errors.length > 0 ? "bug" : "wish");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [withErrors, setWithErrors] = useState(true);
  const [sent, setSent] = useState(false);
  const page = all.shell.pages[current];
  if (sent)
    return (
      <>
        <DialogTitle className="text-base font-semibold">{t.title}</DialogTitle>
        <p className="text-[13px] text-foreground-2">{t.done}</p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSent(false);
              setTitle("");
              setText("");
            }}
          >
            {t.another}
          </Button>
          <Button asChild>
            <a href={BOARD_URL} target="_blank" rel="noreferrer">
              {t.board} <ExternalLink aria-hidden />
            </a>
          </Button>
        </div>
      </>
    );
  const send = () => {
    const url = issueUrl({
      kind,
      title,
      text,
      page,
      errors: withErrors ? errors : [],
    });
    window.open(url, "_blank", "noreferrer");
    setSent(true);
  };
  return (
    <>
      <div className="grid gap-1.5 pr-6">
        <DialogTitle className="text-base font-semibold">{t.title}</DialogTitle>
        <DialogDescription className="text-[13px] text-muted-foreground">
          {t.intro}
        </DialogDescription>
      </div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {(["bug", "wish"] as const).map((one) => (
          <button
            key={one}
            type="button"
            role="radio"
            aria-checked={kind === one}
            onClick={() => {
              setKind(one);
            }}
            className={cn(
              "flex h-9 items-center justify-center gap-2 rounded-lg border text-[13px] [&_svg]:size-4",
              kind === one
                ? "border-foreground bg-surface font-medium text-foreground"
                : "border-border text-muted-foreground hover:border-[#d4d4da]",
            )}
          >
            {one === "bug" ? <Bug aria-hidden /> : <Lightbulb aria-hidden />}
            {t.kinds[one]}
          </button>
        ))}
      </div>
      <Field label={t.short} id="feedback-title">
        <Input
          id="feedback-title"
          value={title}
          placeholder={kind === "bug" ? t.shortBug : t.shortWish}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </Field>
      <Field label={kind === "bug" ? t.what : t.whatWish} id="feedback-text">
        <textarea
          id="feedback-text"
          rows={4}
          value={text}
          className={cn(FIELD_AREA, "resize-y")}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </Field>
      <Similar title={title} kind={kind} />
      <SentWith
        page={page}
        errors={errors}
        withErrors={withErrors}
        onWithErrors={setWithErrors}
      />
      <p className="text-xs text-muted-foreground">{t.account}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t.cancel}
        </Button>
        <Button disabled={!title.trim()} onClick={send}>
          {t.open} <ExternalLink aria-hidden />
        </Button>
      </div>
    </>
  );
}

// What goes with the feedback, all of it seen before sending: the
// version, the page, and the errors caught (which the person may leave out).
function SentWith({
  page,
  errors,
  withErrors,
  onWithErrors,
}: Readonly<{
  page: string;
  errors: CaughtError[];
  withErrors: boolean;
  onWithErrors: (keep: boolean) => void;
}>) {
  const t = useT().feedback;
  return (
    <div className="grid gap-2 rounded-[10px] border border-line-soft bg-surface/60 px-3 py-2.5 text-[13px]">
      <b className="text-xs font-medium text-muted-foreground">{t.sent}</b>
      <span>{t.version(CORE_VERSION)}</span>
      <span>{t.page(page)}</span>
      {errors.length === 0 ? (
        <span className="text-muted-foreground">{t.noErrors}</span>
      ) : (
        <div className="grid gap-1.5">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={withErrors}
              onChange={(event) => {
                onWithErrors(event.target.checked);
              }}
            />
            {t.errors(errors.length)}
          </label>
          {withErrors && (
            <ul className="grid gap-1 pl-6 font-mono text-[11.5px] text-foreground-2">
              {errors.map((error, at) => (
                <li key={at} className="truncate" title={error.text}>
                  <span className="text-faint">{error.at}</span> {error.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <span className="text-xs text-muted-foreground">{t.nothingElse}</span>
    </div>
  );
}

// PROTOTYPE: what is already on the board, made up. The real one would
// ask GitHub's search for open issues with these words.
const ON_BOARD: { number: number; kind: Kind; title: string; thumbs: number }[] =
  [
    { number: 41, kind: "bug", title: "The builder stops when git push is refused", thumbs: 7 },
    { number: 38, kind: "wish", title: "Let the builder work on two cards at once", thumbs: 12 },
    { number: 35, kind: "bug", title: "Board card crashes when a column was renamed", thumbs: 3 },
    { number: 29, kind: "wish", title: "Show signals from Slack on the Signals page", thumbs: 9 },
    { number: 22, kind: "wish", title: "A dark look for the dashboard", thumbs: 15 },
  ];

function Similar({ title, kind }: Readonly<{ title: string; kind: Kind }>) {
  const t = useT().feedback;
  const words = title
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);
  const score = (one: (typeof ON_BOARD)[number]) =>
    words.filter((word) => one.title.toLowerCase().includes(word)).length;
  const shown = ON_BOARD.filter((one) =>
    words.length > 0 ? score(one) > 0 : one.kind === kind,
  )
    .sort((a, b) => score(b) - score(a) || b.thumbs - a.thumbs)
    .slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      <span className="flex items-baseline gap-2 text-[13px] font-medium">
        {t.similar}
        <span className="text-[11px] font-normal text-faint">({t.madeUp})</span>
      </span>
      <ul className="grid rounded-[10px] border border-line-soft text-[13px]">
        {shown.map((one) => (
          <li
            key={one.number}
            className="flex items-center gap-2 border-t border-line-soft px-3 py-2 first:border-t-0"
          >
            <span className="text-faint">#{one.number}</span>
            <span className="flex-1 truncate">{one.title}</span>
            <a
              href={`${BOARD_URL}/${String(one.number)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {t.thumbs(one.thumbs)}
            </a>
          </li>
        ))}
      </ul>
      <span className="text-xs text-muted-foreground">{t.similarHelp}</span>
    </div>
  );
}

// GitHub's "new issue" page, filled in: the kind in the title (labels from
// the address only work for the board's own people), the text, and what
// goes with it. Kept short enough for an address.
function issueUrl(feedback: {
  kind: Kind;
  title: string;
  text: string;
  page: string;
  errors: CaughtError[];
}): string {
  const lines = [
    feedback.text.trim(),
    "",
    "---",
    `Kobble ${CORE_VERSION} · page: ${feedback.page}`,
  ];
  if (feedback.errors.length > 0)
    lines.push(
      "",
      "<details><summary>Errors the factory caught</summary>",
      "",
      "```",
      ...feedback.errors.map((error) => `${error.at} ${error.text}`),
      "```",
      "</details>",
    );
  const params = new URLSearchParams({
    title: `[${feedback.kind === "bug" ? "Bug" : "Wish"}] ${feedback.title.trim()}`,
    body: lines.join("\n").slice(0, 6000),
  });
  return `${BOARD_URL}/new?${params.toString()}`;
}
