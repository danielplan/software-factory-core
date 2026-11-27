// The story and the days of a new test, as Mimic wrote them and the team
// changes them: the name, the story, each day's kind and what happens in
// it (one line each), a day more or less; then Send. Mimic's story is
// asked for once per persona while the page is open.

import { useNavigate } from "react-router";
import { Minus, Plus, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  messageOf,
  post,
  type TestDraft,
  type TestPersona,
} from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { CARD } from "@/components/page-bits";
import { getChecked } from "@/api/query";
import { draftAnswerSchema, startedSchema } from "@/api/schemas/testing";
import { KOBOLDS } from "@/lib/kobolds";
import { testingPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const TITLE = "mt-7 mb-3 text-[17px] font-semibold tracking-[-0.01em]";
const FIELD =
  "w-full rounded-[10px] border border-input bg-card px-3 py-2 text-[14px] leading-normal outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export const mimic = KOBOLDS.find((kobold) => kobold.id === "tester");

// A day as it is edited: its kind, and what happens, one line each.
type DayDraft = { title: string; lines: string };

export type Written = Omit<TestDraft, "days"> & { days: DayDraft[] };

const writtenOf = (draft: TestDraft): Written => ({
  ...draft,
  days: draft.days.map((day) => ({
    title: day.title,
    lines: day.situations.join("\n"),
  })),
});

// Mimic's story for this persona, asked for once; Try again asks anew.
export function useDraft(persona: string) {
  const [asked, setAsked] = useState(0);
  const [got, setGot] = useState<{
    persona: string;
    written: Written | null;
    problem: string | null;
  } | null>(null);
  useEffect(() => {
    let kept = true;
    getChecked(
      `/api/kobble/testing/draft?persona=${encodeURIComponent(persona)}`,
      draftAnswerSchema,
    ).then(
      ({ draft }) => {
        if (kept) setGot({ persona, written: writtenOf(draft), problem: null });
      },
      (error: unknown) => {
        if (kept) setGot({ persona, written: null, problem: messageOf(error) });
      },
    );
    return () => {
      kept = false;
    };
  }, [persona, asked]);
  const mine = got?.persona === persona ? got : null;
  return {
    written: mine?.written ?? null,
    problem: mine?.problem ?? null,
    again: () => {
      setGot(null);
      setAsked(asked + 1);
    },
    change: (written: Written) => {
      setGot({ persona, written, problem: null });
    },
  };
}

type Editing = Readonly<{
  persona: TestPersona;
  written: Written;
  onChange: (written: Written) => void;
}>;

export function StoryForm({ persona, written, onChange }: Editing) {
  const t = useTranslation().t;
  const sending = useSending(persona.id);
  const ready =
    written.title.trim() !== "" &&
    written.days.length > 0 &&
    written.days.every((day) => day.lines.trim() !== "");
  return (
    <>
      <StoryCard persona={persona} written={written} onChange={onChange} />
      <DaysEditor persona={persona} written={written} onChange={onChange} />
      {sending.failed && (
        <p role="alert" className="mt-4 text-[13px] text-destructive">
          {sending.failed}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button
          size="pill"
          busy={sending.busy}
          disabled={!ready || sending.busy}
          onClick={() => {
            sending.go(written);
          }}
        >
          <Send aria-hidden strokeWidth={2} className="size-[15px]" />
          {t("testing.new.send", { name: persona.name })}
        </Button>
        <span className="text-[12.5px] text-muted-foreground">
          {t("testing.new.about")}
        </span>
      </div>
    </>
  );
}

// The test's name and the story, marked as written by Mimic.
function StoryCard({ persona, written, onChange }: Editing) {
  const t = useTranslation().t;
  return (
    <>
      <h2 className={TITLE}>
        {t("testing.new.story", { name: persona.name })}
      </h2>
      <section className={cn(CARD, "grid gap-3 px-6 py-5")}>
        <span className="flex items-center gap-2">
          <KoboldHead size={22} hat={mimic?.hat} color={mimic?.color} />
          <span className="inline-flex h-[22px] items-center rounded-full bg-blue/10 px-2.5 text-[12px] font-medium text-blue">
            {t("testing.new.writtenBy")}
          </span>
          {written.app && (
            <span className="text-[12.5px] text-muted-foreground">
              {t("testing.new.inApp", { app: written.app })}
            </span>
          )}
        </span>
        <input
          aria-label={t("testing.new.titleLabel")}
          value={written.title}
          onChange={(event) => {
            onChange({ ...written, title: event.target.value });
          }}
          className={cn(FIELD, "text-[16px] font-medium")}
        />
        <textarea
          aria-label={t("testing.new.story", { name: persona.name })}
          value={written.story}
          rows={6}
          onChange={(event) => {
            onChange({ ...written, story: event.target.value });
          }}
          className={cn(FIELD, "resize-y")}
        />
        <span className="text-[12.5px] text-muted-foreground">
          {t("testing.new.storyHint")}
        </span>
      </section>
    </>
  );
}

// The days, each its own card, and Add a day.
function DaysEditor({ persona, written, onChange }: Editing) {
  const t = useTranslation().t;
  const { days } = written;
  return (
    <>
      <h2 className={TITLE}>{t("testing.new.days", { name: persona.name })}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {days.map((day, at) => (
          <DayCard
            key={at}
            number={at + 1}
            day={day}
            onDay={(next) => {
              onChange({
                ...written,
                days: days.map((one, i) => (i === at ? next : one)),
              });
            }}
            onRemove={
              days.length > 1
                ? () => {
                    onChange({
                      ...written,
                      days: days.filter((_, i) => i !== at),
                    });
                  }
                : null
            }
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => {
            onChange({ ...written, days: [...days, { title: "", lines: "" }] });
          }}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue"
        >
          <Plus aria-hidden className="size-[15px]" strokeWidth={2.2} />
          {t("testing.new.addDay")}
        </button>
        <span className="text-[12.5px] text-muted-foreground">
          {t("testing.new.daysHint")}
        </span>
      </div>
    </>
  );
}

function DayCard({
  number,
  day,
  onDay,
  onRemove,
}: Readonly<{
  number: number;
  day: DayDraft;
  onDay: (day: DayDraft) => void;
  onRemove: (() => void) | null;
}>) {
  const t = useTranslation().t;
  return (
    <section className={cn(CARD, "grid gap-2 px-5 py-4")}>
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold">
          {t("testing.new.dayTitle", { number })}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("testing.new.removeDay", { number })}
            className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <Minus aria-hidden className="size-[14px]" strokeWidth={2.2} />
          </button>
        )}
      </span>
      <input
        aria-label={t("testing.new.dayKind")}
        placeholder={t("testing.new.dayKind")}
        value={day.title}
        onChange={(event) => {
          onDay({ ...day, title: event.target.value });
        }}
        className={FIELD}
      />
      <textarea
        aria-label={t("testing.new.situations", { number })}
        value={day.lines}
        rows={4}
        onChange={(event) => {
          onDay({ ...day, lines: event.target.value });
        }}
        className={cn(FIELD, "resize-y")}
      />
    </section>
  );
}

// Sending the persona off: busy meanwhile, then the test's page, or why it
// failed.
function useSending(persona: string) {
  const go = useNavigate();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const send = (written: Written) => {
    setBusy(true);
    const days = written.days.map((day) => ({
      title: day.title.trim(),
      situations: day.lines
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));
    post<unknown>("/api/kobble/testing", {
      persona,
      title: written.title.trim(),
      story: written.story,
      days,
      product: written.product,
      locale: written.locale,
      timeZone: written.timeZone,
    })
      .then((answer) => startedSchema.parse(answer))
      .then(
        ({ test }) => {
          setBusy(false);
          void go(testingPath({ test: test.id }));
        },
        (error: unknown) => {
          setBusy(false);
          setFailed(messageOf(error));
        },
      );
  };
  return { busy, failed, go: send };
}
