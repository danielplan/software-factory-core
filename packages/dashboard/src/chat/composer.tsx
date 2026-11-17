// Where a message is written, as in any chat: the field grows with the
// text, Enter sends it, Shift+Enter starts a new line. Files come with the
// paperclip, by dropping them on it, or by pasting a picture; each shows
// above the text until it is sent. Big in the middle of an empty chat, then
// at the bottom.

import { ArrowUp, FileText, Loader2, Paperclip, X } from "lucide-react";
import {
  type ClipboardEvent,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { Sent } from "@/lib/chat-view";
import { cn } from "@/lib/utils";

import { ACCEPTED, type Attaching, useAttachments } from "./use-attachments";

export function Composer({
  onSend,
  placeholder,
  big = false,
}: Readonly<{
  onSend: (text: string, files: Sent[]) => void;
  placeholder: string;
  big?: boolean;
}>) {
  const { t } = useTranslation("chat");
  const [text, setText] = useState("");
  const field = useGrowing(text);
  const attachments = useAttachments();
  const { dragging, dropping, paste } = useDropping(attachments.attach);
  const ready = text.trim() !== "" && !attachments.going;
  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!ready) return;
    onSend(text.trim(), attachments.sent);
    setText("");
    attachments.clear();
  };
  return (
    <form
      onSubmit={submit}
      {...dropping}
      className={cn(
        "mx-auto grid w-full gap-2 rounded-3xl border border-border bg-card p-2.5 shadow-lift transition-[box-shadow,border-color] focus-within:border-ring/60 focus-within:ring-[3px] focus-within:ring-ring/20",
        big ? "max-w-2xl" : "max-w-3xl",
        dragging && "border-primary ring-[3px] ring-primary/25",
      )}
    >
      {attachments.files.length > 0 && (
        <Chips files={attachments.files} onRemove={attachments.remove} />
      )}
      <textarea
        ref={field}
        aria-label={t("composer.label")}
        value={text}
        rows={big ? 3 : 1}
        placeholder={placeholder}
        onChange={(event) => {
          setText(event.target.value);
        }}
        onPaste={paste}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) submit(event);
        }}
        className={cn(
          "max-h-56 resize-none bg-transparent px-2 py-1.5 leading-6 outline-none placeholder:text-muted-foreground",
          big ? "min-h-24 text-body" : "min-h-9 text-body",
        )}
      />
      <Tools ready={ready} onFiles={attachments.attach} />
    </form>
  );
}

// Files dropped on the field, or pictures pasted in it, are attached; the
// field shows it while something is dragged over it.
function useDropping(attach: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  const dropping = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => {
      setDragging(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      attach([...event.dataTransfer.files]);
    },
  };
  const paste = (event: ClipboardEvent) => {
    const pictures = [...event.clipboardData.files];
    if (pictures.length === 0) return;
    event.preventDefault();
    attach(pictures);
  };
  return { dragging, dropping, paste };
}

// The field grows with what is written, up to its highest.
function useGrowing(text: string) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${String(element.scrollHeight)}px`;
  }, [text]);
  return field;
}

// Under the field: the paperclip, which opens the files to choose from,
// and Send.
function Tools({
  ready,
  onFiles,
}: Readonly<{ ready: boolean; onFiles: (files: File[]) => void }>) {
  const { t } = useTranslation("chat");
  const picker = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <input
        ref={picker}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("composer.attach")}
        title={t("composer.attachHint")}
        className="rounded-xl text-muted-foreground"
        onClick={() => picker.current?.click()}
      >
        <Paperclip aria-hidden />
      </Button>
      <Button
        type="submit"
        size="icon"
        aria-label={t("composer.send")}
        disabled={!ready}
        className="ml-auto rounded-xl"
      >
        <ArrowUp aria-hidden />
      </Button>
    </div>
  );
}

// The files attached so far: a small picture or a page, the name, and ×.
function Chips({
  files,
  onRemove,
}: Readonly<{ files: Attaching[]; onRemove: (key: string) => void }>) {
  const { t } = useTranslation("chat");
  return (
    <ul className="flex flex-wrap gap-2 px-1 pt-1">
      {files.map((one) => (
        <li
          key={one.key}
          title={one.problem ?? one.name}
          className={cn(
            "flex max-w-56 animate-enter items-center gap-2 rounded-xl border border-border bg-page py-1 pr-1 pl-1 text-tag",
            one.problem && "border-destructive/50 text-destructive",
          )}
        >
          {one.preview ? (
            <img
              src={one.preview}
              alt=""
              className="size-8 flex-none rounded-lg object-cover"
            />
          ) : (
            <span className="grid size-8 flex-none place-items-center rounded-lg bg-surface-2">
              <FileText aria-hidden className="size-4" />
            </span>
          )}
          <span className="min-w-0 truncate">{one.problem ?? one.name}</span>
          {!one.sent && !one.problem && (
            <Loader2
              aria-label={t("composer.uploading")}
              className="size-3.5 flex-none animate-spin"
            />
          )}
          <button
            type="button"
            aria-label={t("composer.remove", { name: one.name })}
            onClick={() => {
              onRemove(one.key);
            }}
            className="grid size-6 flex-none place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
