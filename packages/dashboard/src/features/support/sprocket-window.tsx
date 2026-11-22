// Sprocket's one window. The "Ask Sprocket anything" bar grows into it;
// Send feedback and Report this error open it too. Its opening fits the page
// you are on and offers a waiting error first; a question goes to the
// support kobold, a wish or something wrong builds a post live
// (kobold-chat.tsx, the script in tell-kobold.ts). What was sent lives on
// the Signals page (Feedback). The new words are in English only for now.

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { post } from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import type { Page } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { onAskSupport } from "@/lib/ask-support";
import { useSupport } from "./use-support";

import { useMine } from "@/api/feedback-board";
import { Feed, LiveCard, SimilarAsYouType } from "./kobold-chat";
import { AskFeed, Input } from "./sprocket-input";
import { Opening } from "./sprocket-opening";
import {
  askMode,
  back,
  invite,
  moved,
  onOpen,
  type Thread,
  useThread,
} from "./tell-kobold";

// Opens on a request (Send feedback, Report this error), ⌘J and a question
// asked from elsewhere; Escape closes. It never opens by itself.
function useWindowKeys(
  page: Page,
  where: string,
  begun: boolean,
  setOpen: (open: (was: boolean) => boolean) => void,
) {
  const started = useRef(begun);
  useEffect(() => {
    started.current = begun;
  }, [begun]);
  useEffect(() => {
    const opened = onOpen(() => {
      setOpen(() => true);
    });
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "j") {
        event.preventDefault();
        if (!started.current) invite(where);
        else setOpen((was) => !was);
      }
      if (event.key === "Escape") setOpen(() => false);
    };
    window.addEventListener("keydown", key);
    const asked = onAskSupport((text) => {
      askMode(where, false);
      setOpen(() => true);
      void post("/api/kobble/support", { text, page }).catch(() => undefined);
    });
    return () => {
      opened();
      window.removeEventListener("keydown", key);
      asked();
    };
  }, [page, where, setOpen]);
}

export function SprocketWindow({ page }: Readonly<{ page: Page }>) {
  const where = useT().shell.pages[page];
  const [open, setOpen] = useState(false);
  const thread = useThread();
  useWindowKeys(page, where, thread !== null, setOpen);
  // The post the chat follows moved on the board: the kobold says so.
  const mine = useMine();
  const followed = mine.find((one) => one.number === thread?.follows);
  useEffect(() => {
    if (followed) moved(followed.number, followed.state);
  }, [followed]);
  // As tall as what it shows, opening or conversation: it grows as lines
  // come in, up to a maximum, then the conversation scrolls inside.
  const roomy = Math.min(window.innerHeight * 0.8, 620);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4 md:left-56">
      <section
        aria-label="Sprocket"
        className={cn(
          "pointer-events-auto flex max-w-full flex-col overflow-hidden border [interpolate-size:allow-keywords] border-border bg-card/95 backdrop-blur transition-[width,height,border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1)]",
          open
            ? "w-[27rem] rounded-2xl bg-card shadow-[0_24px_60px_-20px_rgb(20_24_36/0.35)]"
            : "w-[24rem] rounded-xl shadow-[0_8px_24px_-12px_rgb(20_24_36/0.25)] hover:border-[#d4d4da]",
        )}
        style={{ height: open ? "auto" : 40, maxHeight: roomy }}
      >
        {open && thread ? (
          <div
            className="flex min-h-0 flex-1 flex-col motion-safe:animate-rise"
            style={{ animationDelay: "120ms" }}
          >
            <Header
              begun={thread.step !== "choose"}
              onNew={() => {
                back();
                void post("/api/kobble/support/new").catch(() => undefined);
              }}
              onClose={() => {
                setOpen(false);
              }}
            />
            <Chat thread={thread} page={page} />
          </div>
        ) : (
          <Bar
            onOpen={() => {
              if (thread) setOpen(true);
              else invite(where);
            }}
          />
        )}
      </section>
    </div>
  );
}

// The closed window: the "Ask Sprocket anything" bar.
function Bar({ onOpen }: Readonly<{ onOpen: () => void }>) {
  const all = useT();
  const working = useSupport()?.writing != null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-none items-center gap-2.5 pr-2 pl-2.5 text-left text-[13px] text-muted-foreground"
    >
      <KoboldHead size={22} className={cn(working && "animate-breathe")} />
      <span className="flex-1 truncate">
        {working
          ? all.support.answering("Sprocket")
          : all.support.ask("Sprocket")}
      </span>
      <kbd className="rounded-md border border-border px-1.5 py-0.5 font-sans text-[11px] text-faint">
        ⌘J
      </kbd>
    </button>
  );
}

// Sprocket's face and name, once. "Start over" only once a conversation
// has begun.
function Header({
  begun,
  onNew,
  onClose,
}: Readonly<{ begun: boolean; onNew: () => void; onClose: () => void }>) {
  const t = useT().feedback;
  return (
    <header className="flex flex-none items-center gap-2 py-3 pr-2.5 pl-4">
      <KoboldHead size={22} />
      <span className="text-[13px] font-medium">Sprocket</span>
      <span className="flex-1" />
      {begun && (
        <button
          type="button"
          onClick={onNew}
          className="px-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:underline"
        >
          {t.window.startOver}
        </button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.close}
        onClick={onClose}
      >
        <X aria-hidden className="size-4" />
      </Button>
    </header>
  );
}

// What the window shows for the step the chat is at.
function Body({ thread, page }: Readonly<{ thread: Thread; page: Page }>) {
  if (thread.step === "choose") return <Opening page={page} thread={thread} />;
  if (thread.step === "ask") return <AskFeed thread={thread} page={page} />;
  return (
    <>
      <LiveCard thread={thread} />
      <Feed thread={thread} />
    </>
  );
}

function Chat({ thread, page }: Readonly<{ thread: Thread; page: Page }>) {
  const [text, setText] = useState("");
  return (
    <>
      <Body thread={thread} page={page} />
      <SimilarAsYouType
        text={text}
        thread={thread}
        onThumb={() => {
          setText("");
        }}
      />
      <Input page={page} thread={thread} text={text} onText={setText} />
    </>
  );
}
