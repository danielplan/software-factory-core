// Variant F, "Tell the kobold": the help window, docked at the bottom
// right. Send feedback and Report this error open it. Before any chat it
// shows three starting choices and the person's posts; a choice starts the
// chat with Sprocket in it (kobold-chat.tsx, the script in tell-kobold.ts).
// PROTOTYPE: its words are in English only.

import {
  ArrowLeft,
  ArrowUp,
  Bug,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Lightbulb,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { post } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import type { Page } from "@/lib/routes";
import { Messages } from "@/support/support-bar";
import { useSupport } from "@/support/use-support";

import { useCaughtErrors } from "./factory-errors";
import { issueUrl, useMine } from "./feedback-board";
import { StatePill } from "./feedback-row";
import { Chips, FeedbackThread, START } from "./kobold-chat";
import {
  back,
  onOpen,
  say,
  showPosts,
  start,
  type Thread,
  useThread,
} from "./tell-kobold";

export function HelpPanel({ page }: Readonly<{ page: Page }>) {
  const [open, setOpen] = useState(false);
  const thread = useThread();
  useEffect(() => {
    const opened = onOpen(() => {
      setOpen(true);
    });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => {
      opened();
      window.removeEventListener("keydown", key);
    };
  }, []);
  if (!open || !thread) return null;
  const step = thread.step;
  return (
    <section
      aria-label="Help & feedback"
      className="fixed right-4 bottom-4 z-30 flex h-[min(78vh,600px)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-20px_rgb(20_24_36/0.35)] motion-safe:animate-rise"
    >
      <header className="flex items-center gap-2 px-4 pt-4 pb-3">
        {step !== "choose" && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            onClick={back}
          >
            <ArrowLeft aria-hidden className="size-4" />
          </Button>
        )}
        <b className="flex-1 text-[15px] font-semibold">Help & feedback</b>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onClick={() => {
            setOpen(false);
          }}
        >
          <X aria-hidden className="size-4" />
        </Button>
      </header>
      {step === "choose" ? (
        <Choose />
      ) : step === "posts" ? (
        <Posts />
      ) : step === "ask" ? (
        <AskChat thread={thread} page={page} />
      ) : (
        <>
          <FeedbackThread thread={thread} />
          <Input page={page} thread={thread} />
        </>
      )}
    </section>
  );
}

const CHOICES = [
  { choice: "bug", icon: Bug, label: "Something is wrong" },
  { choice: "wish", icon: Lightbulb, label: "I wish Kobble could…" },
  { choice: "ask", icon: CircleHelp, label: "Ask a question" },
] as const;

function Choose() {
  const mine = useMine();
  return (
    <div className="flex flex-1 flex-col px-4 pb-4">
      <div className="flex items-center gap-3 py-6">
        <KoboldHead size={36} />
        <p className="text-[14px] leading-snug text-foreground-2">
          Hi, I'm Sprocket.
          <br />
          How can I help?
        </p>
      </div>
      <ul className="grid gap-2">
        {CHOICES.map(({ choice, icon: Icon, label }) => (
          <li key={choice}>
            <button
              type="button"
              onClick={() => {
                // A question starts a fresh conversation with the kobold.
                if (choice === "ask")
                  void post("/api/kobble/support/new").catch(() => undefined);
                start(choice);
              }}
              className="flex h-13 w-full items-center gap-3 rounded-xl border border-border px-4 text-left text-[14px] font-medium transition-colors hover:border-[#d4d4da] hover:bg-surface [&_svg]:size-4 [&_svg]:flex-none"
            >
              <Icon aria-hidden className="text-muted-foreground" />
              <span className="flex-1">{label}</span>
              <ChevronRight aria-hidden className="text-faint" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={showPosts}
        className="mt-auto self-start text-[12.5px] text-muted-foreground hover:text-foreground hover:underline"
      >
        Your posts ({mine.length})
      </button>
    </div>
  );
}

function Posts() {
  const mine = useMine();
  return (
    <ul className="grid content-start gap-1 overflow-auto px-4 pb-4">
      {mine.map((one) => (
        <li key={one.number}>
          <a
            href={issueUrl(one.number)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-[13px] hover:bg-surface [&_svg]:size-3.5 [&_svg]:flex-none"
          >
            {one.kind === "bug" ? (
              <Bug aria-hidden className="text-muted-foreground" />
            ) : (
              <Lightbulb aria-hidden className="text-muted-foreground" />
            )}
            <span className="flex-1 truncate">{one.title}</span>
            <StatePill state={one.state} />
            <ExternalLink aria-hidden className="text-faint" />
          </a>
        </li>
      ))}
    </ul>
  );
}

// "Ask a question": the support kobold's own conversation.
function AskChat({ thread, page }: Readonly<{ thread: Thread; page: Page }>) {
  const support = useSupport();
  const asked = (support?.messages.length ?? 0) > 0 || support?.writing != null;
  const ask = (text: string) => {
    void post("/api/kobble/support", { text, page }).catch(() => undefined);
  };
  return (
    <>
      <div className="flex flex-col gap-3 px-4 pt-1 text-[13px] leading-relaxed">
        <p className="self-start">{START.startAsk.line}</p>
        {!asked && <Chips choices={START.startAsk.examples} onPick={ask} />}
      </div>
      {asked ? <Messages support={support} /> : <div className="flex-1" />}
      <Input page={page} thread={thread} onAsk={ask} />
    </>
  );
}

function Input({
  page,
  thread,
  onAsk,
}: Readonly<{ page: Page; thread: Thread; onAsk?: (text: string) => void }>) {
  const t = useT();
  const errors = useCaughtErrors();
  const [text, setText] = useState("");
  const send = () => {
    const said = text.trim();
    if (!said) return;
    setText("");
    if (onAsk) onAsk(said);
    else say(said, t.shell.pages[page], errors);
  };
  return (
    <form
      className="m-3 flex items-end gap-2 rounded-xl border border-border p-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        autoFocus
        rows={1}
        value={text}
        placeholder={
          onAsk || thread.step === "sent"
            ? "Write a message…"
            : "Say it in your own words…"
        }
        onChange={(event) => {
          setText(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="submit"
        size="icon-sm"
        aria-label="Send"
        disabled={!text.trim()}
      >
        <ArrowUp aria-hidden className="size-4" />
      </Button>
    </form>
  );
}
