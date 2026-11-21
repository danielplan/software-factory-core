// Variant F, "Tell the kobold": the feedback conversation inside Sprocket's
// support card (support/support-bar.tsx). The kobold's questions with
// quick answers, the similar post to give a 👍, the draft as a card with
// what goes along (the team's data marked, to take out), one Send, and the
// post it follows, with its state. The script is in tell-kobold.ts.

import {
  Bug,
  CircleUserRound,
  ExternalLink,
  Lightbulb,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIELD_AREA } from "@/lib/field-style";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/use-t";

import {
  BOARD,
  issueUrl,
  ON_BOARD,
  signIn,
  signOut,
  type State,
  useMine,
  useSignedIn,
} from "./feedback-board";
import { StatePill } from "./feedback-row";
import {
  type Draft,
  editDraft,
  type Line,
  moved,
  type Part,
  reply,
  sendDraft,
  teamBits,
  type Thread,
  thumb,
  writeDraft,
} from "./tell-kobold";

export function FeedbackThread({ thread }: Readonly<{ thread: Thread }>) {
  const t = useT().support;
  const end = useRef<HTMLDivElement>(null);
  const mine = useMine();
  const followed = mine.find((one) => one.number === thread.follows);
  useEffect(() => {
    if (followed) moved(followed.number, followed.state);
  }, [followed]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread.lines.length, thread.thinking, thread.step]);
  const last = thread.lines.at(-1);
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 py-3 text-[13px] leading-relaxed">
      {thread.lines.map((line) =>
        line.from === "you" ? (
          <div
            key={line.id}
            className="max-w-[85%] self-end rounded-lg bg-surface px-3 py-1.5"
          >
            {line.text}
          </div>
        ) : (
          <KoboldLine key={line.id} line={line} thread={thread} />
        ),
      )}
      {thread.thinking ? (
        <div className="self-start text-muted-foreground">{t.thinking}</div>
      ) : (
        last?.from === "kobold" && <QuickAnswers say={last.say} />
      )}
      <div ref={end} />
    </div>
  );
}

function KoboldLine({
  line,
  thread,
}: Readonly<{ line: Extract<Line, { from: "kobold" }>; thread: Thread }>) {
  const t = useT().feedback.chat;
  const n = line.number ?? 0;
  const onBoard = ON_BOARD.find((one) => one.number === n);
  const text = (() => {
    switch (line.say) {
      case "askError":
        return t.askError(line.error ?? "");
      case "similar":
        return thread.kind === "bug"
          ? t.similarBug(onBoard?.thumbs ?? 0)
          : t.similar(onBoard?.thumbs ?? 0);
      case "thumbed":
        return t.thumbed(n);
      case "posted":
        return t.posted(n);
      case "moved":
        return t.moved[line.state ?? "sent"](n);
      default:
        return t[line.say];
    }
  })();
  return (
    <div className="grid gap-2 self-stretch">
      <div className="self-start">
        <Markdown text={text} />
      </div>
      {line.say === "similar" && onBoard && (
        <SimilarCard post={onBoard} live={thread.step === "similar"} />
      )}
      {line.say === "draft" && thread.draft && (
        <DraftCard
          draft={thread.draft}
          kind={thread.kind}
          live={thread.step === "draft"}
        />
      )}
      {(line.say === "posted" || line.say === "thumbed") && (
        <PostCard number={n} />
      )}
    </div>
  );
}

// The quick answers under the kobold's last question.
function QuickAnswers({ say }: Readonly<{ say: string }>) {
  const t = useT().feedback.chat;
  const choices =
    say === "askAgain"
      ? t.again
      : say === "askWish" || say === "askBug" || say === "askError"
        ? [t.skip]
        : [];
  if (choices.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {choices.map((choice) => (
        <button
          key={choice}
          type="button"
          onClick={() => {
            reply(choice, choice === t.skip ? "" : choice);
          }}
          className="rounded-full border border-border px-2.5 py-1 text-[12px] text-foreground-2 hover:border-[#d4d4da] hover:bg-surface"
        >
          {choice}
        </button>
      ))}
    </div>
  );
}

function SimilarCard({
  post,
  live,
}: Readonly<{ post: (typeof ON_BOARD)[number]; live: boolean }>) {
  const t = useT().feedback;
  const signedIn = useSignedIn();
  return (
    <div className="grid gap-2.5 rounded-[12px] border border-line-soft bg-surface/60 p-3">
      <a
        href={issueUrl(post.number)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-[13px] hover:underline [&_svg]:size-3.5 [&_svg]:flex-none"
      >
        {post.kind === "bug" ? <Bug aria-hidden /> : <Lightbulb aria-hidden />}
        <span className="text-faint">#{post.number}</span>
        <span className="flex-1 truncate font-medium">{post.title}</span>
        <span className="text-[11.5px] text-muted-foreground">
          {t.thumbs(post.thumbs)}
        </span>
      </a>
      {live && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={writeDraft}>
            {t.chat.different}
          </Button>
          {signedIn ? (
            <Button size="sm" onClick={thumb}>
              {t.chat.addThumb}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                signIn();
                thumb();
              }}
            >
              {t.signIn} · {t.chat.addThumb}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DraftCard({
  draft,
  kind,
  live,
}: Readonly<{ draft: Draft; kind: "bug" | "wish"; live: boolean }>) {
  const t = useT().feedback;
  const signedIn = useSignedIn();
  const marked = draft.parts.some(
    (part) => !part.removed && teamBits(part.text).some((bit) => bit.team),
  );
  const changePart = (id: string, edit: Partial<Part>) => {
    editDraft({
      parts: draft.parts.map((part) =>
        part.id === id ? { ...part, ...edit } : part,
      ),
    });
  };
  return (
    <div
      className={cn(
        "grid gap-3 rounded-[12px] border border-line-soft bg-surface/60 p-3",
        !live && "opacity-70",
      )}
    >
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground [&_svg]:size-3.5">
        {kind === "bug" ? <Bug aria-hidden /> : <Lightbulb aria-hidden />}
        {t.chat.kindWord[kind]} · {BOARD}
      </span>
      <Input
        aria-label={t.partTitle}
        value={draft.title}
        disabled={!live}
        className="font-medium"
        onChange={(event) => {
          editDraft({ title: event.target.value });
        }}
      />
      <textarea
        aria-label={t.chat.description}
        rows={Math.min(6, Math.max(2, Math.ceil(draft.body.length / 50)))}
        value={draft.body}
        disabled={!live}
        className={cn(FIELD_AREA, "resize-y")}
        onChange={(event) => {
          editDraft({ body: event.target.value });
        }}
      />
      <div className="grid gap-1.5">
        <span className="text-[12px] font-medium">{t.chat.goesAlong}</span>
        {marked && live && (
          <p className="flex gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[11.5px] text-foreground-2 [&_svg]:mt-0.5 [&_svg]:size-3 [&_svg]:flex-none">
            <TriangleAlert aria-hidden className="text-warning" />
            {t.chat.draftTeam}
          </p>
        )}
        <ul className="grid gap-1">
          {draft.parts.map((part) => (
            <li key={part.id} className="flex items-start gap-2 text-[12px]">
              <span
                className={cn(
                  "w-16 flex-none text-muted-foreground",
                  part.removed && "line-through",
                )}
              >
                {part.label === "error"
                  ? t.partError(part.at ?? "")
                  : t.chat[part.label]}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 break-words",
                  part.label === "error" && "font-mono text-[11px]",
                  part.removed && "text-faint line-through",
                )}
              >
                {teamBits(part.text).map((bit, at) =>
                  bit.team && !part.removed && live ? (
                    <button
                      key={at}
                      type="button"
                      title={t.remove}
                      onClick={() => {
                        changePart(part.id, {
                          text: part.text.replace(bit.text, t.chat.taken),
                        });
                      }}
                      className="rounded-sm bg-warning/25 px-0.5 text-foreground underline decoration-warning decoration-dotted underline-offset-2 hover:bg-destructive/15 hover:line-through"
                    >
                      {bit.text}
                    </button>
                  ) : (
                    <span key={at}>{bit.text}</span>
                  ),
                )}
              </span>
              {live && (
                <button
                  type="button"
                  aria-label={part.removed ? t.putBack : t.remove}
                  title={part.removed ? t.putBack : t.remove}
                  onClick={() => {
                    changePart(part.id, { removed: !part.removed });
                  }}
                  className="flex-none text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
                >
                  {part.removed ? <RotateCcw aria-hidden /> : <X aria-hidden />}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {live && (
        <div className="flex items-center gap-2 border-t border-line-soft pt-2.5 text-[12px] [&_svg]:size-4 [&_svg]:flex-none">
          <CircleUserRound aria-hidden />
          {signedIn ? (
            <span className="flex-1">
              @{signedIn}{" "}
              <button
                type="button"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                · {t.notYou}
              </button>
            </span>
          ) : (
            <span className="flex-1 text-foreground-2">{t.signInFirst}</span>
          )}
          {signedIn ? (
            <Button size="sm" disabled={!draft.title.trim()} onClick={sendDraft}>
              {t.chat.send}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={signIn}>
              {t.signIn}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const STEPS: State[] = ["sent", "seen", "planned", "done"];

// The post this chat follows, where it stands.
function PostCard({ number }: Readonly<{ number: number }>) {
  const t = useT().feedback;
  const post = useMine().find((one) => one.number === number);
  if (!post) return null;
  const reached = STEPS.indexOf(post.state);
  return (
    <div className="grid gap-2.5 rounded-[12px] border border-line-soft bg-surface/60 p-3">
      <a
        href={issueUrl(post.number)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-[13px] hover:underline [&_svg]:size-3.5 [&_svg]:flex-none"
      >
        <span className="text-faint">#{post.number}</span>
        <span className="flex-1 truncate font-medium">{post.title}</span>
        <StatePill state={post.state} />
        <ExternalLink aria-hidden className="text-muted-foreground" />
      </a>
      <ol className="grid grid-cols-4 gap-1 text-[11px]">
        {STEPS.map((step, at) => (
          <li key={step} className="grid gap-1" title={t.stateHelp[step]}>
            <span
              className={cn(
                "h-1 rounded-full",
                at <= reached ? "bg-foreground/70" : "bg-line-soft",
              )}
            />
            <span
              className={cn(
                at <= reached ? "text-foreground-2" : "text-faint",
                at === reached && "font-medium",
              )}
            >
              {t.states[step]}
            </span>
          </li>
        ))}
      </ol>
      <span className="text-[11px] text-faint">{t.chat.madeUp}</span>
    </div>
  );
}
