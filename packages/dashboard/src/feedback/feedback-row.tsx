// Feedback from anywhere in the factory: a row at the bottom of the sidebar
// that opens a short form (wish or bug, a line, a few words), and, when the
// factory hits an error, a notice above it that offers to report it with
// the details filled in. Before anything goes out the person sees all of
// it, word for word, and can change or remove any part: errors can carry
// their team's data. It is sent with their own GitHub sign-in to the public
// feedback board (feedback-board.ts); afterwards they see it there, and its
// state as the makers answer: seen, planned, done.

import {
  Bug,
  ExternalLink,
  CircleUserRound,
  Lightbulb,
  MessageSquareHeart,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react";
import { useState } from "react";

import { CORE_VERSION } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Tile } from "@/components/sidebar-links";
import { FIELD_AREA } from "@/lib/field-style";
import type { Page } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { VARIANT } from "@/lib/variant";
import { useT } from "@/i18n/use-t";

import {
  type CaughtError,
  putAway,
  useCaughtErrors,
  useFreshError,
} from "./factory-errors";
import {
  BOARD,
  BOARD_URL,
  issueUrl,
  type Kind,
  type Mine,
  ON_BOARD,
  send,
  signIn,
  signOut,
  type State,
  useMine,
  useSignedIn,
} from "./feedback-board";
import { reportError } from "./tell-kobold";

// How the form starts: empty, or reporting one error.
type Start = { kind: Kind; title: string; errors: number[]; n: number };

export function FeedbackRow({ current }: Readonly<{ current: Page }>) {
  return VARIANT === "F" ? (
    <TellKoboldRow current={current} />
  ) : (
    <FormRow current={current} />
  );
}

// Variant F: no form; the row leads to the Feedback page (what was sent,
// and a button to send more); the error notice opens Sprocket's chat.
function TellKoboldRow({ current }: Readonly<{ current: Page }>) {
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
      <a
        href="#feedback"
        aria-current={current === "feedback" ? "page" : undefined}
        className={cn(
          "group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-strong [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]",
          current === "feedback" &&
            "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active",
        )}
      >
        <Tile color="#667085">
          <MessageSquareHeart aria-hidden />
        </Tile>
        {t.row}
      </a>
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

// Variant E: the row opens the form.
function FormRow({ current }: Readonly<{ current: Page }>) {
  const t = useT().feedback;
  const fresh = useFreshError();
  const [start, setStart] = useState<Start | null>(null);
  const open = (from: Omit<Start, "n">) => {
    setStart({ ...from, n: (start?.n ?? 0) + 1 });
  };
  return (
    <>
      {fresh && (
        <ErrorNotice
          error={fresh}
          onReport={() => {
            open({
              kind: "bug",
              title: t.errorTitle(fresh.text.replace(/^Made up: /, "")),
              errors: [fresh.id],
            });
            putAway();
          }}
        />
      )}
      <SendRow
        onClick={() => {
          open({ kind: "wish", title: "", errors: [] });
        }}
      />
      <Dialog
        open={start != null}
        onOpenChange={(now) => {
          if (!now) setStart(null);
        }}
      >
        <DialogContent className="max-h-[92dvh] max-w-[540px] gap-4 overflow-y-auto">
          {start && (
            <FeedbackForm
              key={start.n}
              start={start}
              current={current}
              onClose={() => {
                setStart(null);
              }}
              onAnother={() => {
                open({ kind: "wish", title: "", errors: [] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// The factory just hit an error: offer to report it.
function ErrorNotice({
  error,
  onReport,
}: Readonly<{ error: CaughtError; onReport: () => void }>) {
  const t = useT().feedback;
  return (
    <div className="mb-1.5 grid gap-1.5 rounded-[10px] border border-destructive/30 bg-destructive/5 px-3 py-2">
      <span className="flex items-center gap-2 text-[13px] font-medium text-sidebar-strong [&_svg]:size-[14px] [&_svg]:flex-none">
        <TriangleAlert aria-hidden className="text-destructive" />
        {t.hit}
        <button
          type="button"
          aria-label={t.notNow}
          title={t.notNow}
          onClick={putAway}
          className="ml-auto text-sidebar-muted hover:text-sidebar-strong"
        >
          <X aria-hidden />
        </button>
      </span>
      <span className="line-clamp-2 font-mono text-[11px] text-sidebar-muted">
        {error.text}
      </span>
      <Button size="sm" variant="outline" className="h-7" onClick={onReport}>
        {t.report}
      </Button>
    </div>
  );
}

type Part = { id: string; label: string; text: string; removed: boolean };

function FeedbackForm({
  start,
  current,
  onClose,
  onAnother,
}: Readonly<{
  start: Start;
  current: Page;
  onClose: () => void;
  onAnother: () => void;
}>) {
  const all = useT();
  const t = all.feedback;
  const errors = useCaughtErrors();
  const [step, setStep] = useState<"write" | "check" | "sent">("write");
  const [kind, setKind] = useState<Kind>(start.kind);
  const [title, setTitle] = useState(start.title);
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<number[]>(start.errors);
  const [parts, setParts] = useState<Part[]>([]);
  const [sent, setSent] = useState<Mine | null>(null);
  const page = all.shell.pages[current];
  const reporting = start.errors.length > 0;

  if (step === "sent" && sent)
    return <Sent sent={sent} onClose={onClose} onAnother={onAnother} />;

  if (step === "check")
    return (
      <Check
        kind={kind}
        title={title}
        onTitle={setTitle}
        parts={parts}
        onParts={setParts}
        onBack={() => {
          setStep("write");
        }}
        onSend={() => {
          setSent(send(kind, title.trim()));
          setStep("sent");
        }}
      />
    );

  const toCheck = () => {
    setParts([
      ...(text.trim()
        ? [{ id: "text", label: t.partText, text: text.trim(), removed: false }]
        : []),
      {
        id: "where",
        label: t.partWhere,
        text: `Kobble ${CORE_VERSION} · ${t.pageWord}: ${page}`,
        removed: false,
      },
      ...errors
        .filter((error) => chosen.includes(error.id))
        .map((error) => ({
          id: `error-${String(error.id)}`,
          label: t.partError(error.at),
          text: error.text,
          removed: false,
        })),
    ]);
    setStep("check");
  };

  return (
    <>
      <div className="grid gap-1.5 pr-6">
        <DialogTitle className="text-base font-semibold">
          {reporting ? t.reportTitle : t.title}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-muted-foreground">
          {reporting ? t.reportIntro : t.intro}
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
          rows={3}
          value={text}
          className={cn(FIELD_AREA, "resize-y")}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </Field>
      {!reporting && <Similar title={title} kind={kind} />}
      <ErrorChoice errors={errors} chosen={chosen} onChosen={setChosen} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t.cancel}
        </Button>
        <Button disabled={!title.trim()} onClick={toCheck}>
          {t.toCheck}
        </Button>
      </div>
      <MineList />
    </>
  );
}

// Which of the errors the factory caught go with it.
function ErrorChoice({
  errors,
  chosen,
  onChosen,
}: Readonly<{
  errors: CaughtError[];
  chosen: number[];
  onChosen: (ids: number[]) => void;
}>) {
  const t = useT().feedback;
  if (errors.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-medium">{t.withErrors}</span>
      <ul className="grid gap-1 rounded-[10px] border border-line-soft px-3 py-2">
        {errors.map((error) => (
          <li key={error.id}>
            <label className="flex items-start gap-2 text-[12px]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={chosen.includes(error.id)}
                onChange={(event) => {
                  onChosen(
                    event.target.checked
                      ? [...chosen, error.id]
                      : chosen.filter((id) => id !== error.id),
                  );
                }}
              />
              <span className="line-clamp-2 font-mono text-[11.5px] text-foreground-2">
                <span className="text-faint">{error.at}</span> {error.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Word for word what goes out, each part to change or remove, and who
// sends it.
function Check({
  kind,
  title,
  onTitle,
  parts,
  onParts,
  onBack,
  onSend,
}: Readonly<{
  kind: Kind;
  title: string;
  onTitle: (title: string) => void;
  parts: Part[];
  onParts: (parts: Part[]) => void;
  onBack: () => void;
  onSend: () => void;
}>) {
  const t = useT().feedback;
  const signedIn = useSignedIn();
  const change = (id: string, edit: Partial<Part>) => {
    onParts(
      parts.map((part) => (part.id === id ? { ...part, ...edit } : part)),
    );
  };
  const hasErrors = parts.some(
    (part) => part.id.startsWith("error-") && !part.removed,
  );
  return (
    <>
      <div className="grid gap-1.5 pr-6">
        <DialogTitle className="text-base font-semibold">
          {t.checkTitle}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-muted-foreground">
          {t.checkIntro(BOARD)}
        </DialogDescription>
      </div>
      {hasErrors && (
        <p className="flex gap-2 rounded-[10px] border border-warning/40 bg-warning/10 px-3 py-2 text-[12.5px] text-foreground-2 [&_svg]:mt-0.5 [&_svg]:size-[14px] [&_svg]:flex-none">
          <TriangleAlert aria-hidden className="text-warning" />
          {t.teamData}
        </p>
      )}
      <div className="grid gap-3 rounded-[12px] border border-line-soft bg-surface/60 p-3">
        <Field label={t.partTitle} id="feedback-check-title">
          <Input
            id="feedback-check-title"
            value={`[${kind === "bug" ? "Bug" : "Wish"}] ${title}`}
            onChange={(event) => {
              onTitle(event.target.value.replace(/^\[(Bug|Wish)\] ?/, ""));
            }}
          />
        </Field>
        {parts.map((part) => (
          <div key={part.id} className="grid gap-1.5">
            <span className="flex items-center gap-2 text-[13px] font-medium">
              <span className={cn(part.removed && "text-faint line-through")}>
                {part.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  change(part.id, { removed: !part.removed });
                }}
                className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-normal text-muted-foreground hover:bg-card hover:text-foreground [&_svg]:size-3"
              >
                {part.removed ? (
                  <>
                    <RotateCcw aria-hidden /> {t.putBack}
                  </>
                ) : (
                  <>
                    <X aria-hidden /> {t.remove}
                  </>
                )}
              </button>
            </span>
            {!part.removed && (
              <textarea
                aria-label={part.label}
                rows={Math.min(
                  5,
                  Math.max(1, Math.ceil(part.text.length / 60)),
                )}
                value={part.text}
                className={cn(
                  FIELD_AREA,
                  "resize-y",
                  part.id.startsWith("error-") && "font-mono text-[12px]",
                )}
                onChange={(event) => {
                  change(part.id, { text: event.target.value });
                }}
              />
            )}
          </div>
        ))}
        <span className="text-xs text-muted-foreground">{t.nothingElse}</span>
      </div>
      <div className="flex items-center gap-2 rounded-[10px] border border-line-soft px-3 py-2 text-[13px] [&_svg]:size-4">
        <CircleUserRound aria-hidden />
        {signedIn ? (
          <>
            <span>
              {t.sendsAs} <b className="font-medium">@{signedIn}</b>
            </span>
            <button
              type="button"
              onClick={signOut}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              {t.notYou}
            </button>
          </>
        ) : (
          <>
            <span className="text-foreground-2">{t.signInFirst}</span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={signIn}
            >
              {t.signIn}
            </Button>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          {t.back}
        </Button>
        <Button disabled={!signedIn || !title.trim()} onClick={onSend}>
          {t.send}
        </Button>
      </div>
    </>
  );
}

function Sent({
  sent,
  onClose,
  onAnother,
}: Readonly<{ sent: Mine; onClose: () => void; onAnother: () => void }>) {
  const t = useT().feedback;
  const now = useMine().find((one) => one.number === sent.number) ?? sent;
  return (
    <>
      <div className="grid gap-1.5 pr-6">
        <DialogTitle className="text-base font-semibold">
          {t.thanks}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-muted-foreground">
          {t.onBoard}
        </DialogDescription>
      </div>
      <a
        href={issueUrl(now.number)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-[10px] border border-line-soft px-3 py-2.5 text-[13px] hover:bg-surface [&_svg]:size-3.5"
      >
        <span className="text-faint">#{now.number}</span>
        <span className="flex-1 truncate font-medium">{now.title}</span>
        <StatePill state={now.state} />
        <ExternalLink aria-hidden className="text-muted-foreground" />
      </a>
      <p className="text-xs text-muted-foreground">{t.follow}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onAnother}>
          {t.another}
        </Button>
        <Button onClick={onClose}>{t.close}</Button>
      </div>
      <MineList skip={now.number} />
    </>
  );
}

const PILL: Record<State, string> = {
  sent: "bg-surface text-muted-foreground",
  seen: "bg-blue/10 text-blue",
  planned: "bg-warning/15 text-warning",
  done: "bg-success/10 text-success",
};

export function StatePill({ state }: Readonly<{ state: State }>) {
  const t = useT().feedback;
  return (
    <span
      title={t.stateHelp[state]}
      className={cn(
        "flex-none rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        PILL[state],
      )}
    >
      {t.states[state]}
    </span>
  );
}

// What this person sent before, and where each stands.
function MineList({ skip }: Readonly<{ skip?: number }>) {
  const t = useT().feedback;
  const mine = useMine().filter((one) => one.number !== skip);
  if (mine.length === 0) return null;
  return (
    <div className="grid gap-1.5 border-t border-line-soft pt-3">
      <span className="flex items-baseline gap-2 text-[13px] font-medium">
        {t.mine}
        <a
          href={BOARD_URL}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          {t.board}
        </a>
      </span>
      <ul className="grid text-[13px]">
        {mine.map((one) => (
          <li key={one.number}>
            <a
              href={issueUrl(one.number)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-surface [&_svg]:size-3.5 [&_svg]:flex-none [&_svg]:text-faint"
            >
              {one.kind === "bug" ? (
                <Bug aria-hidden />
              ) : (
                <Lightbulb aria-hidden />
              )}
              <span className="text-faint">#{one.number}</span>
              <span className="flex-1 truncate">{one.title}</span>
              <StatePill state={one.state} />
            </a>
          </li>
        ))}
      </ul>
      <span className="text-[11px] text-faint">{t.madeUp}</span>
    </div>
  );
}

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
    .slice(0, 2);
  if (shown.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-medium">{t.similar}</span>
      <ul className="grid rounded-[10px] border border-line-soft text-[13px]">
        {shown.map((one) => (
          <li
            key={one.number}
            className="flex items-center gap-2 border-t border-line-soft px-3 py-2 first:border-t-0"
          >
            <span className="text-faint">#{one.number}</span>
            <span className="flex-1 truncate">{one.title}</span>
            <a
              href={issueUrl(one.number)}
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
