// What Signals shows when there is nothing new: before the live app is
// connected, a card to connect it (what Kobble reads, the export's address
// and token, kept only in .env on this computer) beside a faded example of
// what will come; once connected, "All quiet" with when the kobold looks
// again, and the signals already handled.

import { Eye, Plug } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  type FieldError,
  type UseFormRegisterReturn,
  useForm,
} from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  CORE_VERSION,
  messageOf,
  post,
  RELEASE_SOURCE,
  type SignalRow,
  type SyncView,
} from "@/api/client";
import { FieldProblem } from "@/components/field-problem";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { connectSchema, markOf } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { useRead } from "@/api/query";
import { handledSchema } from "@/api/schemas/signals";

import { CARD, TypeChip } from "@/components/page-bits";
import { lookAgainWords, statusWords, whoOf } from "@/lib/signals-view";

// The pretend signals of the empty list: their type and how wide their line is.
const GHOSTS = [
  ["bug", 62],
  ["request", 74],
  ["feedback", 55],
  ["request", 68],
] as const;

const READS = ["bug", "request", "feedback"] as const;

// The guide in the core's repository, at this core's release.
const HOW = `https://github.com/${RELEASE_SOURCE.replace(/^github:/, "")}/blob/release-${CORE_VERSION}/docs/reference/live-export.md`;

function Field({
  label,
  placeholder,
  field,
  state,
  secret = false,
}: Readonly<{
  label: string;
  placeholder: string;
  field: UseFormRegisterReturn;
  // Whether it holds, to say why not under it.
  state: { error?: FieldError; isDirty: boolean };
  secret?: boolean;
}>) {
  const problem = `${field.name}-problem`;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
        {label}
        <input
          type={secret ? "password" : "text"}
          autoComplete="off"
          placeholder={placeholder}
          {...markOf(state, problem)}
          {...field}
          className="h-10 rounded-xl border border-border bg-card px-3 text-[13px] text-foreground outline-none placeholder:text-faint focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-destructive"
        />
      </label>
      <FieldProblem id={problem} field={state} />
    </div>
  );
}

export function ConnectSignals({ app }: Readonly<{ app: string }>) {
  const t = useTranslation().t;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <ConnectCard app={app} />
      <div>
        <div className="mx-1 mt-1 mb-2.5 text-[12.5px] text-muted-foreground">
          {t("signals.connect.seeHere")}
        </div>
        <div className={CARD}>
          {GHOSTS.map(([type, width], at) => (
            <GhostRow key={at} type={type} width={width} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ConnectCard({ app }: Readonly<{ app: string }>) {
  const form = useForm({
    resolver: zodResolver(connectSchema),
    defaultValues: { url: "", token: "" },
    mode: "onTouched",
  });
  const { isSubmitting: busy, isValid } = form.formState;
  const [problem, setProblem] = useState<string | null>(null);
  const t = useTranslation().t;
  const connect = form.handleSubmit(async (values) => {
    setProblem(null);
    await post("/api/kobble/connect", values).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  });
  return (
    <form
      className={cn(CARD, "flex flex-col gap-4 px-7 py-[26px]")}
      onSubmit={(event) => void connect(event)}
    >
      <div className="flex items-center gap-3.5">
        <KoboldHead size={48} />
        <div>
          <div className="text-[15px] font-semibold">
            {t("signals.connect.title")}
          </div>
          <div className="text-[13.5px] text-muted-foreground">
            {t("signals.connect.reads", { app })}
          </div>
        </div>
      </div>
      <Reads />
      <Field
        label={t("signals.connect.address")}
        placeholder="https://your-app/api/kobble/export"
        field={form.register("url")}
        state={form.getFieldState("url", form.formState)}
      />
      <Field
        label={t("signals.connect.token")}
        placeholder={t("signals.connect.tokenHint")}
        field={form.register("token")}
        state={form.getFieldState("token", form.formState)}
        secret
      />
      {problem && (
        <p role="alert" className="text-[13px] text-destructive">
          {problem}
        </p>
      )}
      <div className="flex items-center gap-2.5">
        <Button type="submit" size="pill" disabled={busy || !isValid}>
          <Plug aria-hidden />
          {busy ? t("signals.connect.checking") : t("signals.connect.connect")}
        </Button>
        <span className="text-[12.5px] text-muted-foreground">
          {t("signals.connect.saved")}
        </span>
      </div>
      <Privacy app={app} />
    </form>
  );
}

// What Kobble reads, as the three kinds of signal.
function Reads() {
  const t = useTranslation().t;
  return (
    <div className="flex flex-col gap-2.5 text-[13px] text-foreground-2">
      {READS.map((type) => (
        <div key={type} className="flex items-center gap-2.5">
          <TypeChip type={type} />
          <span>{t(`signals.reads.${type}`)}</span>
        </div>
      ))}
    </div>
  );
}

function Privacy({ app }: Readonly<{ app: string }>) {
  const t = useTranslation().t;
  return (
    <div className="border-t border-border-soft pt-3.5 text-[13px] text-muted-foreground">
      {t("signals.connect.privacy", { app })}{" "}
      <a
        href={HOW}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-blue"
      >
        {t("signals.connect.how")}
      </a>
    </div>
  );
}

function GhostRow({
  type,
  width,
}: Readonly<{ type: SignalRow["type"]; width: number }>) {
  return (
    <div
      aria-hidden
      className="flex items-center gap-3.5 border-t border-border-soft px-5 py-3.5 opacity-55 first:border-t-0"
    >
      <span className="size-[34px] flex-none rounded-full bg-[#eef0f4]" />
      <div className="flex-1">
        <div
          className="h-[9px] rounded-[5px] bg-[#e6e8ee]"
          style={{ width: `${String(width)}%` }}
        />
        <div
          className="mt-2 h-2 rounded-[5px] bg-[#eef0f4]"
          style={{ width: `${String(width - 18)}%` }}
        />
      </div>
      <TypeChip type={type} />
    </div>
  );
}

export function AllQuiet({
  app,
  sync,
  now,
}: Readonly<{ app: string; sync: SyncView; now: Date }>) {
  const [handled, setHandled] = useState(false);
  const t = useTranslation().t;
  return (
    <>
      <div
        className={cn(
          CARD,
          "flex flex-col items-center gap-2.5 px-6 py-14 text-center",
        )}
      >
        <KoboldHead size={64} />
        <div className="mt-1.5 text-[15px] font-semibold">
          {t("signals.quietTitle")}
        </div>
        <div className="max-w-[420px] text-[13px] text-muted-foreground">
          {t("signals.quiet.none", { app })} {lookAgainWords(sync.next, now, t)}
        </div>
        <Button
          variant="ring"
          size="pill-sm"
          className="mt-2.5"
          onClick={() => {
            setHandled(!handled);
          }}
        >
          <Eye aria-hidden />
          {handled ? t("signals.quiet.hide") : t("signals.quiet.see")}
        </Button>
      </div>
      {handled && <Handled />}
    </>
  );
}

function Handled() {
  const { data } = useRead("/api/kobble/handled", handledSchema);
  const t = useTranslation().t;
  if (!data) return null;
  return (
    <div className={CARD}>
      {data.signals.length === 0 && (
        <p className="p-[50px] text-center text-muted-foreground">
          {t("signals.quiet.nothingHandled")}
        </p>
      )}
      {data.signals.map((signal) => (
        <div
          key={signal.id}
          className="flex items-center gap-3.5 border-t border-border-soft px-5 py-3.5 first:border-t-0"
        >
          <span className="grid min-w-0 flex-1">
            <span className="truncate">{signal.text}</span>
            <span className="text-[12.5px] text-muted-foreground">
              {whoOf(signal, t)} · {statusWords(signal, t)}
            </span>
          </span>
          <TypeChip type={signal.type} />
        </div>
      ))}
    </div>
  );
}
