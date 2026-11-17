// The chat's bubbles, the same wherever someone talks with the kobold: the
// kobold's at the left with its picture, the person's at the right with
// the files they sent above it, and three moving dots while the kobold
// thinks or writes.

import { CornerDownRight, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { Sent } from "@/lib/chat-view";
import { KoboldMark } from "@/understand/bits";

// The kobold's message at the left, with its picture.
export function Bubble({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex max-w-[90%] animate-enter items-start gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-full bg-tint ring-1 ring-tint-line">
        <KoboldMark className="size-[30px]" />
      </span>
      <div className="min-w-0 rounded-3xl rounded-tl-lg bg-card px-4 py-2.5 text-body whitespace-pre-wrap shadow-soft">
        {children}
      </div>
    </div>
  );
}

// A message at the right, with its files above it; marked as a change of
// plan when it steered the kobold.
export function Mine({
  files = [],
  steer = false,
  children,
}: Readonly<{ files?: Sent[]; steer?: boolean; children: ReactNode }>) {
  const { t } = useTranslation("chat");
  return (
    <div className="grid animate-enter justify-items-end gap-1.5">
      {files.length > 0 && <Files files={files} />}
      {steer && (
        <span className="flex items-center gap-1 text-tag text-primary">
          <CornerDownRight aria-hidden className="size-3" />
          {t("steerTag")}
        </span>
      )}
      <p className="max-w-[80%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-body whitespace-pre-wrap text-primary-foreground">
        {children}
      </p>
    </div>
  );
}

function Files({ files }: Readonly<{ files: Sent[] }>) {
  return (
    <span className="flex max-w-[80%] flex-wrap justify-end gap-1.5">
      {files.map((file) =>
        file.preview ? (
          <img
            key={file.id}
            src={file.preview}
            alt={file.name}
            className="size-20 rounded-2xl object-cover ring-1 ring-border"
          />
        ) : (
          <span
            key={file.id}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-tag"
          >
            <FileText aria-hidden className="size-3.5" />
            {file.name}
          </span>
        ),
      )}
    </span>
  );
}

// Three dots that move one after another, and what is going on, small.
export function Typing({ label }: Readonly<{ label: string }>) {
  return (
    <span className="flex items-center gap-3" role="status">
      <span aria-hidden className="flex h-5 items-center gap-1">
        {[0, 1, 2].map((at) => (
          <span
            key={at}
            className="size-2 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${String(at * 150)}ms` }}
          />
        ))}
      </span>
      <span className="text-note text-muted-foreground">{label}…</span>
    </span>
  );
}
