import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { SignalRow } from "@/api/client";

import { Chevron } from "@/components/page-bits";
import { alreadyLine } from "@/lib/signals-view";

// The one plain line about work that exists already: an exploration (it
// opens it) or a fix.
export function Already({ signal }: Readonly<{ signal: SignalRow }>) {
  const t = useTranslation().t;
  const line = alreadyLine(signal, t);
  if (!line) return null;
  const words = (
    <span className="flex-1">
      {line.words} <b className="font-semibold">{line.what}</b>
      {line.column ? ` ${line.column}` : ""}
    </span>
  );
  if (signal.already?.kind === "work")
    return (
      <p className="mb-[18px] flex items-center gap-3.5 rounded-[14px] bg-solved px-5 py-3.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden
          className="flex-none"
        >
          <circle cx="8" cy="8" r="7" fill="var(--success)" />
          <path
            d="m5 8.2 2 2 4-4.2"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {words}
      </p>
    );
  return (
    <a
      href={`#explore/${encodeURIComponent(signal.already?.id ?? "")}`}
      className="mb-[18px] flex items-center gap-3.5 rounded-[14px] bg-ground px-5 py-3.5 hover:bg-hover"
    >
      <FlaskConical aria-hidden strokeWidth={2} className="size-4 flex-none" />
      {words}
      <Chevron />
    </a>
  );
}
