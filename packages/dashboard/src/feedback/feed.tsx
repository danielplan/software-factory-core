// The conversation: Sprocket's lines type in after a moment of thinking,
// the person's own lines, and the quick replies under the last one.

import { useCallback, useEffect, useRef, useState } from "react";

import { Markdown } from "@/components/markdown";
import { useT } from "@/i18n/use-t";

import { Thinking } from "./chips";
import { useOnBoard } from "./feedback-board";
import { QuickReplies } from "./quick-replies";
import { SimilarOffer, SimilarRow } from "./similar-posts";
import type { Line, Thread } from "./tell-kobold";

// The kobold's lines already typed in, so they do not type again.
const typed = new Set<number>();

type KoboldSaid = Extract<Line, { from: "kobold" }>;

type Words = ReturnType<typeof useT>["feedback"];

// The lines that say the same every time.
const PLAIN = ["askError", "draft", "added", "cleaned"] as const;
const isPlain = (say: string): say is (typeof PLAIN)[number] =>
  PLAIN.some((one) => one === say);

// The lines that depend on the thread or on a number.
function saidWith(
  line: KoboldSaid,
  thread: Thread,
  thumbs: number,
  t: Words,
): string | null {
  const n = line.number ?? 0;
  switch (line.say) {
    case "askBug":
      // "Sorry" was said already, when the person chose "Something is
      // wrong".
      return thread.lines.some(
        (one) => one.from === "kobold" && one.say === "startBug",
      )
        ? t.window.askBugAfterSorry
        : t.chat.askBug;
    case "similar":
      return t.window.similar(thumbs, thread.kind === "bug");
    case "thumbed":
      return t.window.thumbed(n);
    case "posted":
      return t.window.posted(n);
    case "moved":
      return t.chat.moved[line.state ?? "sent"](n);
    default:
      return null;
  }
}

// The words of a kobold line.
function wordsOf(
  line: KoboldSaid,
  thread: Thread,
  thumbs: number,
  t: Words,
): string {
  if (isPlain(line.say)) return t.window.lines[line.say];
  const said = saidWith(line, thread, thumbs, t);
  if (said) return said;
  switch (line.say) {
    case "startBug":
    case "startWish":
    case "startAsk":
      return t.window.starts[line.say].line;
    case "invite":
    case "askWish":
    case "askAgain":
      return t.chat[line.say];
    default:
      return "";
  }
}

// How much of the text is typed so far; it types in, two letters at a time.
function useTyping(
  line: KoboldSaid,
  text: string,
  onGrow: () => void,
  onDone: () => void,
): number {
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
  return shown;
}

function KoboldLine({
  line,
  thread,
  onGrow,
  onDone,
}: Readonly<{
  line: KoboldSaid;
  thread: Thread;
  onGrow: () => void;
  onDone: () => void;
}>) {
  const t = useT().feedback;
  const n = line.number ?? 0;
  const onBoard = useOnBoard().find((one) => one.number === n);
  const text = wordsOf(line, thread, onBoard?.thumbs ?? 0, t);
  const shown = useTyping(line, text, onGrow, onDone);
  const offer = line.say === "similar" && onBoard && shown >= text.length;
  return (
    <div className="grid gap-2.5 self-stretch">
      <div className="max-w-[92%] self-start">
        <Markdown text={text.slice(0, shown)} />
      </div>
      {offer && thread.step === "similar" && (
        <SimilarOffer post={onBoard} problem={thread.problem} />
      )}
      {offer && thread.step !== "similar" && (
        <SimilarRow post={onBoard} thumbed={thread.follows === n} />
      )}
    </div>
  );
}

export function Feed({ thread }: Readonly<{ thread: Thread }>) {
  const box = useRef<HTMLDivElement>(null);
  const inside = useRef<HTMLDivElement>(null);
  // Kept at the newest line, unless the person scrolled up to read.
  const pinned = useRef(true);
  const [, setDone] = useState(0);
  const scroll = useCallback(() => {
    const el = box.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, []);
  // Whatever grows (a line typing in, quick replies, the offer, the card
  // above taking room), the newest stays in view.
  useEffect(() => {
    const observer = new ResizeObserver(scroll);
    if (box.current) observer.observe(box.current);
    if (inside.current) observer.observe(inside.current);
    return () => {
      observer.disconnect();
    };
  }, [scroll]);
  useEffect(scroll, [thread.lines.length, thread.thinking, scroll]);
  const last = thread.lines.at(-1);
  const lastTyped = last?.from === "kobold" && typed.has(last.id);
  return (
    <div
      ref={box}
      onScroll={(event) => {
        const el = event.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      }}
      className="flex min-h-0 flex-1 flex-col overflow-auto px-4 pt-3 pb-2 text-[13px] leading-relaxed [mask-image:linear-gradient(to_bottom,transparent,black_14px)]"
    >
      <div className="flex-1" />
      <div ref={inside} className="flex flex-col gap-2.5">
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
          <QuickReplies thread={thread} say={last.say} />
        )}
      </div>
    </div>
  );
}
