// What Signals shows when there is nothing new: before the live app is
// connected, a card to connect it (what Kobble reads, the export's address
// and token, kept only in .env on this computer) beside a faded example of
// what will come; once connected, "All quiet" with when the kobold looks
// again, and the signals already handled.

import { useState } from "react";

import {
  CORE_VERSION,
  messageOf,
  post,
  RELEASE_SOURCE,
  type SignalRow,
  type SyncView,
} from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Read, useRead } from "@/lib/use-read";

import { CARD, TypeChip } from "./bits";
import { lookAgainWords, statusWords, whoOf } from "./view";

const READS: [SignalRow["type"], string][] = [
  ["bug", "people report, and errors and failed automations"],
  ["request", "people send, and when the assistant can’t do something"],
  ["feedback", "from persona tests and everything else"],
];

// The guide in the core's repository, at this core's release.
const HOW = `https://github.com/${RELEASE_SOURCE.replace(/^github:/, "")}/blob/release-${CORE_VERSION}/docs/reference/live-export.md`;

function Field({
  label,
  placeholder,
  value,
  secret = false,
  onChange,
}: Readonly<{
  label: string;
  placeholder: string;
  value: string;
  secret?: boolean;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
      {label}
      <input
        type={secret ? "password" : "text"}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="h-10 rounded-xl border border-border bg-card px-3 text-[13px] text-foreground outline-none placeholder:text-faint focus-visible:ring-[3px] focus-visible:ring-ring/30"
      />
    </label>
  );
}

export function ConnectSignals({ app }: Readonly<{ app: string }>) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <ConnectCard app={app} />
      <div>
        <div className="mx-1 mt-1 mb-2.5 text-[12.5px] text-muted-foreground">
          What you’ll see here
        </div>
        <div className={CARD}>
          {(
            [
              ["bug", 62],
              ["request", 74],
              ["feedback", 55],
              ["request", 68],
            ] as const
          ).map(([type, width], at) => (
            <GhostRow key={at} type={type} width={width} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ConnectCard({ app }: Readonly<{ app: string }>) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <form
      className={cn(CARD, "flex flex-col gap-4 px-7 py-[26px]")}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setProblem(null);
        post("/api/kobble/connect", { url, token })
          .catch((error: unknown) => {
            setProblem(messageOf(error));
          })
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      <div className="flex items-center gap-3.5">
        <KoboldHead size={48} />
        <div>
          <div className="text-[15px] font-semibold">Connect your app</div>
          <div className="text-[13.5px] text-muted-foreground">
            Kobble reads what happens in {app} every 30 minutes.
          </div>
        </div>
      </div>
      <Reads />
      <Field
        label="Address of the export"
        placeholder="https://your-app/api/kobble/export"
        value={url}
        onChange={setUrl}
      />
      <Field
        label="Token"
        placeholder="Paste the token from your app"
        value={token}
        secret
        onChange={setToken}
      />
      {problem && (
        <p role="alert" className="text-[13px] text-destructive">
          {problem}
        </p>
      )}
      <div className="flex items-center gap-2.5">
        <Button
          type="submit"
          size="pill"
          disabled={busy || !url.trim() || !token.trim()}
        >
          {busy ? "Checking…" : "Connect"}
        </Button>
        <span className="text-[12.5px] text-muted-foreground">
          Saved on this computer only, in .env
        </span>
      </div>
      <Privacy app={app} />
    </form>
  );
}

// What Kobble reads, as the three kinds of signal.
function Reads() {
  return (
    <div className="flex flex-col gap-2.5 text-[13px] text-foreground-2">
      {READS.map(([type, words]) => (
        <div key={type} className="flex items-center gap-2.5">
          <TypeChip type={type} />
          <span>{words}</span>
        </div>
      ))}
    </div>
  );
}

function Privacy({ app }: Readonly<{ app: string }>) {
  return (
    <div className="border-t border-border-soft pt-3.5 text-[13px] text-muted-foreground">
      Only anonymous events leave {app}: no names, no entries.{" "}
      <a
        href={HOW}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-blue"
      >
        How to add the export to your app
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
  return (
    <>
      <div
        className={cn(
          CARD,
          "flex flex-col items-center gap-2.5 px-6 py-14 text-center",
        )}
      >
        <KoboldHead size={64} />
        <div className="mt-1.5 text-[15px] font-semibold">All quiet</div>
        <div className="max-w-[420px] text-[13px] text-muted-foreground">
          No new bugs, requests or feedback from {app}.{" "}
          {lookAgainWords(sync.next, now)}
        </div>
        <Button
          variant="ring"
          size="pill-sm"
          className="mt-2.5"
          onClick={() => {
            setHandled(!handled);
          }}
        >
          {handled ? "Hide handled signals" : "See handled signals"}
        </Button>
      </div>
      {handled && <Handled />}
    </>
  );
}

function Handled() {
  const { data } = useRead("/api/kobble/handled") as Read<{
    signals: SignalRow[];
  }>;
  if (!data) return null;
  return (
    <div className={CARD}>
      {data.signals.length === 0 && (
        <p className="p-[50px] text-center text-muted-foreground">
          Nothing handled yet
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
              {whoOf(signal)} · {statusWords(signal)}
            </span>
          </span>
          <TypeChip type={signal.type} />
        </div>
      ))}
    </div>
  );
}
