// Sprocket's one window. The "Ask Sprocket anything" bar grows into it;
// Send feedback and Report this error open it too. Its opening fits the page
// you are on and offers a waiting error first; a question goes to the
// support kobold, a wish or something wrong builds a post live
// (kobold-chat.tsx, the script in tell-kobold.ts). What was sent lives on
// the Signals page (Feedback). The new words are in English only for now.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { post } from "@/api/client";
import {
  SprocketBar,
  SprocketDock,
  SprocketHead,
} from "@/components/layout/sprocket-dock";

import type { Page } from "@/lib/routes";
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
  const where = useTranslation().t(`shell.pages.${page}`);
  const [open, setOpen] = useState(false);
  const thread = useThread();
  useWindowKeys(page, where, thread !== null, setOpen);
  // The post the chat follows moved on the board: the kobold says so.
  const mine = useMine();
  const followed = mine.find((one) => one.number === thread?.follows);
  useEffect(() => {
    if (followed) moved(followed.number, followed.state);
  }, [followed]);
  return (
    <SprocketDock open={open}>
      {open && thread ? (
        <div
          className="flex min-h-0 flex-1 flex-col motion-safe:animate-rise"
          style={{ animationDelay: "120ms" }}
        >
          <SprocketHead
            onClose={() => {
              setOpen(false);
            }}
          >
            {thread.step !== "choose" && <StartOver />}
          </SprocketHead>
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
    </SprocketDock>
  );
}

// The closed window: the "Ask Sprocket anything" bar.
function Bar({ onOpen }: Readonly<{ onOpen: () => void }>) {
  const all = useTranslation().t;
  const working = useSupport()?.writing != null;
  return (
    <SprocketBar
      working={working}
      line={
        working
          ? all("support.answering", { name: "Sprocket" })
          : all("support.ask", { name: "Sprocket" })
      }
      onOpen={onOpen}
    />
  );
}

// Once a conversation has begun: Start over.
function StartOver() {
  const t = useTranslation().t;
  return (
    <button
      type="button"
      onClick={() => {
        back();
        void post("/api/kobble/support/new").catch(() => undefined);
      }}
      className="px-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:underline"
    >
      {t("feedback.window.startOver")}
    </button>
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
