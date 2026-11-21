// Variant F, "Tell the kobold": the feedback side of Sprocket's window
// (sprocket-window.tsx). The post builds itself in a card pinned at the
// top while the person talks; below it, the kobold's short lines type in
// after a moment of thinking, with quick replies that change at each step.
// After Send the card becomes the post's live state. The script is in
// tell-kobold.ts. PROTOTYPE: the new words are in English only.

import {
  Bug,
  CircleUserRound,
  ExternalLink,
  Lightbulb,
  RotateCcw,
  ThumbsUp,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { KoboldHead } from "@/components/kobold-face";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

import { useCaughtErrors } from "./factory-errors";
import {
  issueUrl,
  ON_BOARD,
  signIn,
  type State,
  useMine,
  useSignedIn,
} from "./feedback-board";
import { StatePill } from "./feedback-row";
import {
  back,
  editDraft,
  findSimilarPosts,
  type Line,
  liveDraft,
  type Part,
  removeTeamData,
  reply,
  say,
  sendDraft,
  teamBits,
  type Thread,
  thumb,
  thumbFor,
  writeDraft,
} from "./tell-kobold";

// PROTOTYPE: the window's first lines and its quick replies.
export const START = {
  startBug: {
    line: "Sorry about that. What went wrong?",
    examples: [
      "The builder stopped halfway",
      "My cards don't show",
      "A page shows an error",
    ],
  },
  startWish: {
    line: "Tell me what you wish Kobble could do.",
    examples: [
      "Work on two cards at once",
      "See signals from Slack",
      "Export the board",
    ],
  },
  startAsk: {
    line: "What would you like to know?",
    examples: [
      "How do I start a build?",
      "What is a persona?",
      "Where do signals come from?",
    ],
  },
};

const REPLIES: Partial<Record<string, string[]>> = {
  askWish: ["It would save me time", "My team keeps asking"],
  askBug: ["I clicked Build", "It happened by itself"],
  askError: ["I moved a card to Build", "Nothing, it just stopped"],
};

// ---- The post, building itself ----

export function LiveCard({ thread }: Readonly<{ thread: Thread }>) {
  if (thread.step === "sent" && thread.follows != null)
    return <StatusCard number={thread.follows} />;
  return <BuildingCard thread={thread} />;
}

function BuildingCard({ thread }: Readonly<{ thread: Thread }>) {
  const t = useT().feedback;
  const draft = liveDraft(thread);
  const ready = thread.step === "draft";
  const signedIn = useSignedIn();
  const changePart = (part: Part, edit: Partial<Part>) => {
    if (!draft) return;
    editDraft({
      parts: draft.parts.map((one) =>
        one.id === part.id ? { ...one, ...edit } : one,
      ),
    });
  };
  const sentences = draft?.body.split(/\n\n+/).filter(Boolean) ?? [];
  return (
    <div className="mx-3 mt-0.5 grid max-h-[46%] flex-none gap-2 overflow-auto rounded-xl border border-line-soft bg-surface/50 px-3.5 py-3 motion-safe:animate-rise">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground [&_svg]:size-3">
        {thread.kind === "bug" ? <Bug aria-hidden /> : <Lightbulb aria-hidden />}
        {thread.kind === "bug" ? "Bug" : "Wish"} · new post
        <span className="ml-auto flex items-center gap-1.5">
          {!ready && (
            <span className="size-1.5 rounded-full bg-[#8b8ff0] motion-safe:animate-breathe" />
          )}
          {ready ? "Ready to send" : "Writing itself…"}
        </span>
      </span>
      {draft ? (
        ready ? (
          <input
            aria-label="Title"
            value={draft.title}
            onChange={(event) => {
              editDraft({ title: event.target.value });
            }}
            className="-mx-1 rounded-md bg-transparent px-1 text-[14px] font-semibold outline-none hover:bg-card focus:bg-card"
          />
        ) : (
          <b
            key={draft.title}
            className="text-[14px] font-semibold motion-safe:animate-rise"
          >
            {draft.title}
          </b>
        )
      ) : (
        <Placeholder className="h-4 w-2/3" />
      )}
      {sentences.length > 0 ? (
        <div className="grid gap-1 text-[12.5px] leading-snug text-foreground-2">
          {sentences.map((one, at) => (
            <p key={`${String(at)}-${one}`} className="motion-safe:animate-rise">
              {one}
            </p>
          ))}
        </div>
      ) : (
        <div className="grid gap-1.5">
          <Placeholder className="h-3 w-full" />
          <Placeholder className="h-3 w-4/5" />
        </div>
      )}
      <div className="flex flex-wrap gap-1 pt-0.5">
        {(draft?.parts ?? []).map((part) => (
          <span
            key={part.id}
            className={cn(
              "group inline-flex max-w-full items-start gap-1 rounded-md border border-line-soft bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground motion-safe:animate-rise",
              part.label === "error" && "basis-full font-mono text-[10.5px]",
              part.removed && "line-through opacity-50",
            )}
          >
            <span className="min-w-0 break-words">
              {part.label === "error" ? "error: " : ""}
              {teamBits(part.text.replace(/^Made up: /, "")).map((bit, at) =>
                bit.team && !part.removed ? (
                  <button
                    key={at}
                    type="button"
                    title={`${t.remove}: the board is public`}
                    onClick={() => {
                      changePart(part, {
                        text: part.text.replace(bit.text, t.chat.taken),
                      });
                    }}
                    className="rounded-sm bg-warning/25 px-0.5 text-foreground hover:bg-destructive/15 hover:line-through"
                  >
                    {bit.text}
                  </button>
                ) : (
                  <span key={at}>{bit.text}</span>
                ),
              )}
            </span>
            {ready && (
              <button
                type="button"
                aria-label={part.removed ? t.putBack : t.remove}
                onClick={() => {
                  changePart(part, { removed: !part.removed });
                }}
                className="mt-px flex-none opacity-0 group-hover:opacity-100 [&_svg]:size-3"
              >
                {part.removed ? <RotateCcw aria-hidden /> : <X aria-hidden />}
              </button>
            )}
          </span>
        ))}
      </div>
      {ready && draft && (
        <div className="flex items-center gap-2 pt-1 text-[11.5px] text-muted-foreground motion-safe:animate-rise [&_svg]:size-3.5">
          <CircleUserRound aria-hidden />
          <span className="flex-1">
            {signedIn ? `as @${signedIn}` : "with your GitHub sign-in"}
          </span>
          <Button
            size="sm"
            disabled={!draft.title.trim()}
            onClick={() => {
              if (!signedIn) signIn();
              sendDraft();
            }}
          >
            Send
          </Button>
        </div>
      )}
    </div>
  );
}

function Placeholder({ className }: Readonly<{ className: string }>) {
  return (
    <span
      className={cn(
        "block rounded-full bg-line-soft/70 motion-safe:animate-breathe",
        className,
      )}
    />
  );
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
      className="mx-3 mt-0.5 grid flex-none gap-2 rounded-xl border border-line-soft bg-surface/50 px-3.5 py-2.5 hover:bg-surface motion-safe:animate-rise"
    >
      <span className="flex items-center gap-2 text-[12.5px] [&_svg]:size-3 [&_svg]:flex-none">
        <span className="text-faint">#{post.number}</span>
        <span className="flex-1 truncate font-medium">{post.title}</span>
        <StatePill state={post.state} />
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

// ---- The conversation ----

// The kobold's lines already typed in, so they do not type again.
const typed = new Set<number>();

export function Feed({
  thread,
  onPosts,
}: Readonly<{ thread: Thread; onPosts: () => void }>) {
  const end = useRef<HTMLDivElement>(null);
  const [, setDone] = useState(0);
  const scroll = () => {
    end.current?.scrollIntoView({ block: "end" });
  };
  useEffect(scroll, [thread.lines.length, thread.thinking]);
  const last = thread.lines.at(-1);
  const lastTyped = last?.from === "kobold" && typed.has(last.id);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto px-4 pt-3 pb-2 text-[13px] leading-relaxed">
      <div className="flex-1" />
      {thread.lines.map((line) =>
        line.from === "you" ? (
          <div
            key={line.id}
            className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-surface px-3 py-1.5 motion-safe:animate-rise"
          >
            {line.text}
          </div>
        ) : (
          <KoboldLine
            key={line.id}
            line={line}
            thread={thread}
            onGrow={scroll}
            onDone={() => {
              setDone((n) => n + 1);
            }}
          />
        ),
      )}
      {thread.thinking && <Thinking />}
      {!thread.thinking && lastTyped && (
        <QuickReplies thread={thread} say={last.say} onPosts={onPosts} />
      )}
      <div ref={end} />
    </div>
  );
}

export function Thinking() {
  return (
    <div className="flex items-center gap-2 self-start text-muted-foreground motion-safe:animate-rise">
      <KoboldHead size={18} className="motion-safe:animate-bob" />
      <span className="flex gap-1">
        {[0, 1, 2].map((at) => (
          <span
            key={at}
            className="size-1.5 rounded-full bg-current motion-safe:animate-breathe"
            style={{ animationDelay: `${String(at * 0.2)}s` }}
          />
        ))}
      </span>
    </div>
  );
}

function KoboldLine({
  line,
  thread,
  onGrow,
  onDone,
}: Readonly<{
  line: Extract<Line, { from: "kobold" }>;
  thread: Thread;
  onGrow: () => void;
  onDone: () => void;
}>) {
  const t = useT().feedback.chat;
  const n = line.number ?? 0;
  const onBoard = ON_BOARD.find((one) => one.number === n);
  const text = (() => {
    switch (line.say) {
      case "askError":
        return "I put the error in the post above. What were you doing when it happened?";
      case "similar":
        return thread.kind === "bug"
          ? `${String(onBoard?.thumbs ?? 0)} teams ran into this too:`
          : `${String(onBoard?.thumbs ?? 0)} teams want this too:`;
      case "draft":
        return "Here it is, above. Change anything, or send it.";
      case "added":
        return "Added it to the post.";
      case "cleaned":
        return "Done: your team's data is out.";
      case "thumbed":
        return `Your 👍 is on #${String(n)}. I'll follow it above.`;
      case "posted":
        return `Sent as #${String(n)}. I'll follow it above.`;
      case "moved":
        return t.moved[line.state ?? "sent"](n);
      case "startBug":
      case "startWish":
      case "startAsk":
        return START[line.say].line;
      default:
        return t[line.say];
    }
  })();
  const [shown, setShown] = useState(() =>
    typed.has(line.id) ? text.length : 0,
  );
  useEffect(() => {
    if (shown >= text.length) {
      if (!typed.has(line.id)) {
        typed.add(line.id);
        onDone();
      }
      return;
    }
    const timer = setTimeout(() => {
      setShown((was) => Math.min(text.length, was + 2));
      onGrow();
    }, 14);
    return () => {
      clearTimeout(timer);
    };
  }, [shown, text, line.id, onDone, onGrow]);
  return (
    <div className="grid gap-2 self-stretch">
      <div className="max-w-[92%] self-start">
        <Markdown text={text.slice(0, shown)} />
      </div>
      {line.say === "similar" &&
        onBoard &&
        shown >= text.length &&
        thread.step === "similar" && <SimilarOffer post={onBoard} />}
    </div>
  );
}

function SimilarOffer({
  post,
}: Readonly<{ post: (typeof ON_BOARD)[number] }>) {
  return (
    <div className="grid gap-2 motion-safe:animate-slide-in">
      <SimilarRow post={post} onThumb={thumb} />
      <button
        type="button"
        onClick={writeDraft}
        className="self-end text-[12px] text-muted-foreground hover:text-foreground"
      >
        Mine is different →
      </button>
    </div>
  );
}

export function SimilarRow({
  post,
  onThumb,
}: Readonly<{ post: (typeof ON_BOARD)[number]; onThumb: () => void }>) {
  const signedIn = useSignedIn();
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line-soft bg-card px-3 py-2 text-[12.5px] [&_svg]:size-3.5 [&_svg]:flex-none">
      <a
        href={issueUrl(post.number)}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
      >
        <span className="text-faint">#{post.number}</span>
        <span className="truncate">{post.title}</span>
      </a>
      <button
        type="button"
        onClick={() => {
          if (!signedIn) signIn();
          onThumb();
        }}
        className="flex flex-none items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11.5px] text-foreground-2 transition-colors hover:border-[#8b8ff0] hover:bg-[#8b8ff0]/10"
      >
        <ThumbsUp aria-hidden />
        {post.thumbs}
      </button>
    </div>
  );
}

// Posts on the board that sound like what is being typed, sliding in.
export function SimilarAsYouType({
  text,
  thread,
  onThumb,
}: Readonly<{ text: string; thread: Thread | null; onThumb: () => void }>) {
  const mine = useMine();
  const step = thread?.step ?? "choose";
  if (!["choose", "listen", "question", "again"].includes(step)) return null;
  if (text.trim().length < 6) return null;
  const said = `${thread?.said ?? ""} ${text}`;
  const kind = thread?.chosen ? thread.kind : null;
  const posts = findSimilarPosts(said, kind).filter(
    (one) => !mine.some((it) => it.number === one.number),
  );
  if (posts.length === 0) return null;
  return (
    <div className="grid gap-1.5 px-3 pt-1">
      <span className="text-[11px] text-muted-foreground">
        Already on the board?
      </span>
      {posts.map((post) => (
        <div key={post.number} className="motion-safe:animate-slide-in">
          <SimilarRow
            post={post}
            onThumb={() => {
              thumbFor(post.number);
              onThumb();
            }}
          />
        </div>
      ))}
    </div>
  );
}

function QuickReplies({
  thread,
  say: line,
  onPosts,
}: Readonly<{ thread: Thread; say: string; onPosts: () => void }>) {
  const t = useT().feedback.chat;
  const errors = useCaughtErrors();
  const draft = liveDraft(thread);
  if (line === "startBug" || line === "startWish")
    return (
      <Chips
        choices={START[line].examples}
        onPick={(choice) => {
          say(choice, thread.page, errors);
        }}
      />
    );
  if (line in REPLIES || line === "askAgain") {
    const choices =
      line === "askAgain" ? t.again : [...(REPLIES[line] ?? []), t.skip];
    return (
      <Chips
        choices={choices}
        onPick={(choice) => {
          reply(choice, choice === t.skip ? "" : choice);
        }}
      />
    );
  }
  if (thread.step === "draft" && draft) {
    const marked = draft.parts.some(
      (part) => !part.removed && teamBits(part.text).some((bit) => bit.team),
    );
    return (
      <Chips
        choices={[
          ...(marked ? ["Take out my team's data"] : []),
          "Add a detail",
        ]}
        onPick={(choice) => {
          if (choice === "Add a detail")
            document.getElementById("sprocket-input")?.focus();
          else removeTeamData(t.taken);
        }}
      />
    );
  }
  if (thread.step === "sent")
    return (
      <Chips
        choices={["Something else", "Your posts"]}
        onPick={(choice) => {
          if (choice === "Your posts") onPosts();
          else back();
        }}
      />
    );
  return null;
}

export function Chips({
  choices,
  onPick,
  align = "end",
}: Readonly<{
  choices: string[];
  onPick: (choice: string) => void;
  align?: "start" | "end";
}>) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      {choices.map((choice, at) => (
        <button
          key={choice}
          type="button"
          onClick={() => {
            onPick(choice);
          }}
          style={{ animationDelay: `${String(at * 60)}ms` }}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-[12px] text-foreground-2 transition-colors hover:border-[#c7cbfb] hover:bg-[#8b8ff0]/8 motion-safe:animate-rise"
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
