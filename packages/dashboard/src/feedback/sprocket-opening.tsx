// Sprocket's window before any talk: one short line, one suggestion (a
// waiting error, else what fits this page) and the three starting choices.

import { Bug, CircleHelp, Lightbulb, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { post } from "@/api";
import { useT } from "@/i18n/use-t";
import type { Page } from "@/lib/routes";

import {
  type CaughtError,
  useCaughtErrors,
  useFreshError,
} from "./factory-errors";
import type { Kind } from "./feedback-board";
import {
  askMode,
  reportError,
  start,
  startWith,
  type Thread,
} from "./tell-kobold";

// What the opening offers on each page.
const HERE: Record<Page, { text: string; kind: Kind | "ask"; said?: string }> =
  {
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

const short = (text: string) => {
  const up = text.charAt(0).toUpperCase() + text.slice(1);
  return up.length > 46 ? `${up.slice(0, 44)}…` : up;
};

type Suggestion = {
  key: string;
  icon: ReactNode;
  text: ReactNode;
  go: () => void;
};

// The one suggestion: the waiting error, else what fits the page.
function suggestionFor(
  page: Page,
  thread: Thread,
  fresh: CaughtError | null,
  errors: CaughtError[],
  report: string,
): Suggestion {
  if (fresh)
    return {
      key: "error",
      icon: <TriangleAlert aria-hidden className="text-warning" />,
      text: (
        <>
          <span className="truncate">{short(fresh.text)}</span>
          <span className="flex-none text-muted-foreground">· Report it</span>
        </>
      ),
      go: () => {
        reportError(fresh, thread.page, report);
      },
    };
  const here = HERE[page];
  return {
    key: "here",
    icon: <span className="size-1.5 rounded-full bg-[#8b8ff0]" />,
    text: <span className="truncate">{here.text}</span>,
    go: () => {
      if (here.kind === "ask") askMode(thread.page);
      else if (here.said) startWith(here.kind, here.said, thread.page, errors);
      else start(here.kind);
    },
  };
}

// Before any talk: one short line, one suggestion (a waiting error, else
// what fits this page) and the three starting choices.
export function Opening({
  page,
  thread,
}: Readonly<{ page: Page; thread: Thread }>) {
  const t = useT();
  const fresh = useFreshError();
  const errors = useCaughtErrors();
  const suggestions = [
    suggestionFor(page, thread, fresh, errors, t.feedback.report),
  ];
  return (
    <div className="flex flex-none flex-col gap-3 px-4 pt-1 pb-4">
      <p className="text-[14px] leading-snug motion-safe:animate-rise">
        How can I help?
      </p>
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
