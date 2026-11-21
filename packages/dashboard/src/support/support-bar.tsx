// The support kobold at the bottom of every page: a small bar that asks
// "Ask Sprocket…" (⌘J or a click opens it), and above it, once open, the
// conversation in a card. It answers questions about Kobble and the
// project, and adds the personas and explorations people describe to it
// (server kobble/support.ts); New persona and New exploration open it.

import { ArrowUp, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { messageOf, post } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { SprocketWindow } from "@/feedback/sprocket-window";
import { useKoboldName } from "@/lib/brand";
import type { Page } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { VARIANT } from "@/lib/variant";

import { onAskSupport } from "./ask-support";
import { type SupportView, useSupport } from "./use-support";
import { useT } from "@/i18n/use-t";

// Variant F: the bar grows into Sprocket's one window, which also takes
// feedback (feedback/sprocket-window.tsx).
export function SupportBar({ page }: Readonly<{ page: Page }>) {
  return VARIANT === "F" ? (
    <SprocketWindow page={page} />
  ) : (
    <SupportBarE page={page} />
  );
}

function SupportBarE({ page }: Readonly<{ page: Page }>) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const name = useKoboldName();
  const support = useSupport();
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "j") {
        event.preventDefault();
        setOpen((was) => !was);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    const asked = onAskSupport((text) => {
      setOpen(true);
      void post("/api/kobble/support", { text, page }).catch(() => undefined);
    });
    return () => {
      window.removeEventListener("keydown", key);
      asked();
    };
  }, [page]);
  const working = support?.writing != null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4 md:left-56">
      {open ? (
        <Conversation
          name={name}
          page={page}
          support={support}
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          className="pointer-events-auto flex h-10 w-full max-w-sm items-center gap-2.5 rounded-xl border border-border bg-card/95 pr-2 pl-2.5 text-left text-[13px] text-muted-foreground shadow-[0_8px_24px_-12px_rgb(20_24_36/0.25)] backdrop-blur transition-colors hover:border-[#d4d4da] motion-safe:animate-rise"
        >
          <KoboldHead size={22} className={cn(working && "animate-breathe")} />
          <span className="flex-1 truncate">
            {working ? t.support.answering(name) : t.support.ask(name)}
          </span>
          <kbd className="rounded-md border border-border px-1.5 py-0.5 font-sans text-[11px] text-faint">
            ⌘J
          </kbd>
        </button>
      )}
    </div>
  );
}

function Conversation({
  name,
  page,
  support,
  onClose,
}: Readonly<{
  name: string;
  page: Page;
  support: SupportView | null;
  onClose: () => void;
}>) {
  const t = useT();
  const [refused, setRefused] = useState<string | null>(null);
  const empty = (support?.messages.length ?? 0) === 0 && !support?.writing;
  return (
    <section
      aria-label={`${name}, support`}
      className="pointer-events-auto flex max-h-[min(70vh,600px)] w-full max-w-[26rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_-16px_rgb(20_24_36/0.3)] motion-safe:animate-rise"
    >
      <header className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5">
        <KoboldHead size={22} />
        <span className="grid flex-1">
          <b className="text-[13px] font-semibold">{name}</b>
          <small className="text-[11.5px] text-muted-foreground">
            {t.support.role}
          </small>
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.support.newConversation}
          title={t.support.newConversation}
          onClick={() => {
            post("/api/kobble/support/new").catch((error: unknown) => {
              setRefused(messageOf(error));
            });
          }}
        >
          <Plus aria-hidden className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.support.close}
          onClick={onClose}
        >
          <X aria-hidden className="size-4" />
        </Button>
      </header>
      {empty ? (
        <p className="px-4 py-5 text-[13px] text-muted-foreground">
          {t.support.empty}
        </p>
      ) : (
        <Messages support={support} />
      )}
      {(refused ?? support?.problem) && (
        <p role="alert" className="px-4 pb-2 text-xs text-destructive">
          {refused ?? support?.problem}
        </p>
      )}
      <Ask page={page} busy={support?.writing != null} onRefused={setRefused} />
    </section>
  );
}

export function Messages({ support }: Readonly<{ support: SupportView | null }>) {
  const t = useT();
  const end = useRef<HTMLDivElement>(null);
  const count = support?.messages.length ?? 0;
  const writing = support?.writing;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count, writing]);
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 py-3 text-[13px] leading-relaxed">
      {support?.messages.map((message, at) =>
        message.from === "kobold" ? (
          <div key={at} className="self-start">
            <Markdown text={message.text} />
          </div>
        ) : (
          <div
            key={at}
            className="max-w-[85%] self-end rounded-lg bg-surface px-3 py-1.5"
          >
            {message.text}
          </div>
        ),
      )}
      {writing != null && (
        <div className="self-start text-muted-foreground">
          {writing ? (
            <Markdown text={writing} />
          ) : (
            (support?.activity ?? t.support.thinking)
          )}
        </div>
      )}
      <div ref={end} />
    </div>
  );
}

function Ask({
  page,
  busy,
  onRefused,
}: Readonly<{
  page: Page;
  busy: boolean;
  onRefused: (problem: string | null) => void;
}>) {
  const t = useT();
  const [text, setText] = useState("");
  const send = () => {
    const said = text.trim();
    if (!said || busy) return;
    setText("");
    onRefused(null);
    post("/api/kobble/support", { text: said, page }).catch(
      (error: unknown) => {
        setText(said);
        onRefused(messageOf(error));
      },
    );
  };
  return (
    <form
      className="flex items-end gap-2 border-t border-border p-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        autoFocus
        rows={1}
        value={text}
        placeholder={t.support.question}
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
        aria-label={t.support.send}
        disabled={busy || !text.trim()}
      >
        <ArrowUp aria-hidden className="size-4" />
      </Button>
    </form>
  );
}
