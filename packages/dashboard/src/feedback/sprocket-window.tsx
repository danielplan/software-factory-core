// Variant F, "Tell the kobold": Sprocket's one window. The "Ask Sprocket
// anything" bar grows into it; Send feedback and Report this error open it
// too. Its opening fits the page you are on and offers a waiting error
// first; a question goes to the support kobold, a wish or something wrong
// builds a post live (kobold-chat.tsx, the script in tell-kobold.ts).
// "Your posts" is a tab in its header. PROTOTYPE: English only.

import {
  ArrowUp,
  Bug,
  CircleHelp,
  ExternalLink,
  Lightbulb,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { post } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import type { Page } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { onAskSupport } from "@/support/ask-support";
import { Messages } from "@/support/support-bar";
import { useSupport } from "@/support/use-support";

import { useCaughtErrors, useFreshError } from "./factory-errors";
import { issueUrl, type Kind, useMine } from "./feedback-board";
import { StatePill } from "./feedback-row";
import {
  Chips,
  Feed,
  LiveCard,
  SimilarAsYouType,
  START,
  Thinking,
} from "./kobold-chat";
import {
  askMode,
  back,
  invite,
  looksLikeFeedback,
  moved,
  onOpen,
  reportError,
  say,
  start,
  startWith,
  type Thread,
  useThread,
} from "./tell-kobold";

// What the opening offers on each page.
const HERE: Record<
  Page,
  { text: string; kind: Kind | "ask"; said?: string }
> = {
  home: { text: "Missing something on Home? Tell me", kind: "wish" },
  system: {
    text: "A product looks wrong? Report it",
    kind: "bug",
    said: "A product on the System page looks wrong",
  },
  signals: { text: "Missing a kind of signal? Tell me", kind: "wish" },
  explore: {
    text: "Prototype not what you asked? Report it",
    kind: "bug",
    said: "A prototype doesn't show what I asked for",
  },
  build: {
    text: "Builder stopped? Report it",
    kind: "bug",
    said: "The builder stopped",
  },
  personas: { text: "Wish personas did more? Tell me", kind: "wish" },
  settings: { text: "Can't find a setting? Ask me", kind: "ask" },
};

const CHOICES = [
  { choice: "bug", icon: Bug, label: "Something is wrong" },
  { choice: "wish", icon: Lightbulb, label: "I wish Kobble could…" },
  { choice: "ask", icon: CircleHelp, label: "Ask a question" },
] as const;

export function SprocketWindow({ page }: Readonly<{ page: Page }>) {
  const all = useT();
  const where = all.shell.pages[page];
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "posts">("chat");
  const thread = useThread();
  const support = useSupport();
  const started = useRef(thread != null);
  started.current = thread != null;
  useEffect(() => {
    const opened = onOpen(() => {
      setTab("chat");
      setOpen(true);
    });
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "j") {
        event.preventDefault();
        if (!started.current) invite(where);
        else setOpen((was) => !was);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    const asked = onAskSupport((text) => {
      askMode(where, false);
      setTab("chat");
      setOpen(true);
      void post("/api/kobble/support", { text, page }).catch(() => undefined);
    });
    return () => {
      opened();
      window.removeEventListener("keydown", key);
      asked();
    };
  }, [page, where]);
  // The post the chat follows moved on the board: the kobold says so.
  const mine = useMine();
  const followed = mine.find((one) => one.number === thread?.follows);
  useEffect(() => {
    if (followed) moved(followed.number, followed.state);
  }, [followed]);
  const working = support?.writing != null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4 md:left-56">
      <section
        aria-label="Sprocket"
        className={cn(
          "pointer-events-auto flex max-w-full flex-col overflow-hidden border border-border bg-card/95 backdrop-blur transition-[width,height,border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1)]",
          open
            ? cn(
                "w-[27rem] rounded-2xl bg-card shadow-[0_24px_60px_-20px_rgb(20_24_36/0.35)]",
                // The opening is small; a conversation gets room.
                tab === "chat" && thread?.step === "choose"
                  ? "h-[372px]"
                  : tab === "posts"
                    ? "h-[400px]"
                    : "h-[min(80vh,620px)]",
              )
            : "h-10 w-[24rem] rounded-xl shadow-[0_8px_24px_-12px_rgb(20_24_36/0.25)] hover:border-[#d4d4da]",
        )}
      >
        {open && thread ? (
          <div
            className="flex min-h-0 flex-1 flex-col motion-safe:animate-rise"
            style={{ animationDelay: "120ms" }}
          >
            <Header
              tab={tab}
              onTab={setTab}
              onNew={() => {
                setTab("chat");
                back();
                void post("/api/kobble/support/new").catch(() => undefined);
              }}
              onClose={() => {
                setOpen(false);
              }}
            />
            {tab === "posts" ? (
              <Posts />
            ) : (
              <Chat
                thread={thread}
                page={page}
                onPosts={() => {
                  setTab("posts");
                }}
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (thread) setOpen(true);
              else invite(where);
            }}
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
        )}
      </section>
    </div>
  );
}

function Header({
  tab,
  onTab,
  onNew,
  onClose,
}: Readonly<{
  tab: "chat" | "posts";
  onTab: (tab: "chat" | "posts") => void;
  onNew: () => void;
  onClose: () => void;
}>) {
  const mine = useMine();
  const tabs = [
    { key: "chat", label: "Sprocket" },
    { key: "posts", label: `Your posts · ${String(mine.length)}` },
  ] as const;
  return (
    <header className="flex flex-none items-center gap-1 px-3 pt-3 pb-1.5">
      <KoboldHead size={22} className="mr-1" />
      <nav className="flex gap-0.5 rounded-lg bg-surface p-0.5 text-[12px]">
        {tabs.map((one) => (
          <button
            key={one.key}
            type="button"
            onClick={() => {
              onTab(one.key);
            }}
            className={cn(
              "rounded-md px-2.5 py-1 transition-colors",
              tab === one.key
                ? "bg-card font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {one.label}
          </button>
        ))}
      </nav>
      <span className="flex-1" />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="New conversation"
        title="New conversation"
        onClick={onNew}
      >
        <Plus aria-hidden className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
        <X aria-hidden className="size-4" />
      </Button>
    </header>
  );
}

function Chat({
  thread,
  page,
  onPosts,
}: Readonly<{ thread: Thread; page: Page; onPosts: () => void }>) {
  const [text, setText] = useState("");
  return (
    <>
      {thread.step === "choose" ? (
        <Opening page={page} thread={thread} />
      ) : thread.step === "ask" ? (
        <AskFeed thread={thread} page={page} />
      ) : (
        <>
          <LiveCard thread={thread} />
          <Feed thread={thread} onPosts={onPosts} />
        </>
      )}
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

// Before any talk: what fits this page, a waiting error first, and the
// three starting choices.
function Opening({ page, thread }: Readonly<{ page: Page; thread: Thread }>) {
  const t = useT();
  const fresh = useFreshError();
  const errors = useCaughtErrors();
  const here = HERE[page];
  const suggestions = [
    ...(fresh
      ? [
          {
            key: "error",
            icon: <TriangleAlert aria-hidden className="text-warning" />,
            text: (
              <>
                <span className="truncate">
                  {short(fresh.text.replace(/^Made up: /, ""))}
                </span>
                <span className="flex-none text-muted-foreground">
                  · Report it
                </span>
              </>
            ),
            go: () => {
              reportError(fresh, thread.page, t.feedback.report);
            },
          },
        ]
      : []),
    {
      key: "here",
      icon: <span className="size-1.5 rounded-full bg-[#8b8ff0]" />,
      text: <span className="truncate">{here.text}</span>,
      go: () => {
        if (here.kind === "ask") askMode(thread.page);
        else if (here.said)
          startWith(here.kind, here.said, thread.page, errors);
        else start(here.kind);
      },
    },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end gap-4 overflow-auto px-4 pb-3">
      <div className="flex items-center gap-2.5 motion-safe:animate-rise">
        <KoboldHead size={30} />
        <p className="text-[14px] leading-snug">
          Hi, I'm Sprocket.
          <span className="block text-[12.5px] text-muted-foreground">
            You're on {t.shell.pages[page]}. How can I help?
          </span>
        </p>
      </div>
      <ul className="grid gap-1.5">
        {suggestions.map((one, at) => (
          <li
            key={one.key}
            className="motion-safe:animate-rise"
            style={{ animationDelay: `${String(80 + at * 70)}ms` }}
          >
            <button
              type="button"
              onClick={one.go}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-line-soft bg-surface/50 px-3 text-left text-[13px] transition-colors hover:border-[#c7cbfb] hover:bg-surface [&_svg]:size-3.5 [&_svg]:flex-none"
            >
              {one.icon}
              {one.text}
            </button>
          </li>
        ))}
      </ul>
      <div
        className="flex flex-wrap gap-1.5 motion-safe:animate-rise"
        style={{ animationDelay: "240ms" }}
      >
        {CHOICES.map(({ choice, icon: Icon, label }) => (
          <button
            key={choice}
            type="button"
            onClick={() => {
              if (choice === "ask")
                void post("/api/kobble/support/new").catch(() => undefined);
              start(choice);
            }}
            className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] text-foreground-2 transition-colors hover:border-[#c7cbfb] hover:bg-[#8b8ff0]/8 [&_svg]:size-3"
          >
            <Icon aria-hidden className="text-muted-foreground" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const short = (text: string) => {
  const up = text.charAt(0).toUpperCase() + text.slice(1);
  return up.length > 46 ? `${up.slice(0, 44)}…` : up;
};

// A question: the support kobold's own conversation.
function AskFeed({ thread, page }: Readonly<{ thread: Thread; page: Page }>) {
  const support = useSupport();
  const asked = (support?.messages.length ?? 0) > 0 || support?.writing != null;
  if (asked) return <Messages support={support} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 px-4 pb-2 text-[13px]">
      {thread.thinking ? (
        <Thinking />
      ) : (
        thread.lines.length > 0 && (
          <>
            <p className="self-start motion-safe:animate-rise">
              {START.startAsk.line}
            </p>
            <Chips
              choices={START.startAsk.examples}
              onPick={(text) => {
                void post("/api/kobble/support", { text, page }).catch(
                  () => undefined,
                );
              }}
            />
          </>
        )
      )}
    </div>
  );
}

function Input({
  page,
  thread,
  text,
  onText,
}: Readonly<{
  page: Page;
  thread: Thread;
  text: string;
  onText: (text: string) => void;
}>) {
  const t = useT();
  const errors = useCaughtErrors();
  const where = t.shell.pages[page];
  const send = () => {
    const said = text.trim();
    if (!said) return;
    onText("");
    const question =
      thread.step === "ask" ||
      (thread.step === "choose" && !looksLikeFeedback(said));
    if (question) {
      if (thread.step !== "ask") askMode(where, false);
      void post("/api/kobble/support", { text: said, page }).catch(
        () => undefined,
      );
      return;
    }
    say(said, where, errors);
  };
  const placeholder = {
    choose: "Ask, or tell me what's wrong…",
    ask: "Ask a question…",
    listen: "Say it in your own words…",
    question: "Your answer…",
    again: "Your answer…",
    similar: "Or tell me more…",
    draft: "Tell me what to change…",
    sent: "Anything else?",
  }[thread.step];
  return (
    <form
      className="m-3 mt-2 flex flex-none items-end gap-2 rounded-xl border border-border bg-card p-1.5 transition-colors focus-within:border-[#c7cbfb]"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        id="sprocket-input"
        autoFocus
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(event) => {
          onText(event.target.value);
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

function Posts() {
  const mine = useMine();
  return (
    <ul className="grid min-h-0 flex-1 content-start gap-0.5 overflow-auto px-3 pt-2 pb-3">
      {mine.map((one, at) => (
        <li
          key={one.number}
          className="motion-safe:animate-rise"
          style={{ animationDelay: `${String(at * 50)}ms` }}
        >
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
