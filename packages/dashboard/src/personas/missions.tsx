// A persona's missions: "Send on a mission" with the mission the kobold
// suggests (marked Suggested with the kobold's face until its words are
// changed), Send and Change; then one list of missions, newest first: the
// one running on top with the step it is on, then those before with what
// they found (bug, idea, open question), each at the step where it
// happened. Send everyone is on
// the Personas page (send-everyone.tsx).

import { Send } from "lucide-react";
import { useState } from "react";

import {
  type KobblePersonaPage,
  messageOf,
  type MissionIdea,
  post,
} from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { type Read, useRead } from "@/lib/use-read";
import { cn } from "@/lib/utils";
import { CARD } from "@/signals/bits";

import { Mission } from "./mission-list";

const TITLE = "mt-7 mb-3 text-[17px] font-semibold tracking-[-0.01em]";

export const ideaPath = (persona: string) =>
  `/api/kobble/mission?persona=${encodeURIComponent(persona)}`;

export const send = (
  persona: string,
  idea: Pick<MissionIdea, "task" | "product">,
) =>
  post("/api/kobble/tests", {
    persona,
    task: idea.task,
    product: idea.product,
  });

// The mission the kobold suggests for a persona (asked for once, then kept
// by the factory until the persona is sent).
function useMissionIdea(persona: string) {
  return useRead(ideaPath(persona)) as Read<{ mission: MissionIdea }>;
}

export function PersonaMissions({
  page,
}: Readonly<{ page: KobblePersonaPage }>) {
  const { persona, tests, signals } = page;
  const busy = tests.some(
    (test) => test.status === "queued" || test.status === "running",
  );
  return (
    <div className="mb-8">
      <h2 className={TITLE}>Send on a mission</h2>
      <NextMission persona={persona.id} name={persona.name} busy={busy} />
      <h2 className={TITLE}>Missions</h2>
      {tests.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">
          No missions yet. Send {persona.name} on the suggested mission to get
          your first signals.
        </p>
      ) : (
        <div className={CARD}>
          {tests.map((test) => (
            <Mission
              key={test.id}
              test={test}
              persona={persona.id}
              found={signals.filter((one) => test.signals.includes(one.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// The kobold's suggestion as one calm card: the kobold's face and a
// Suggested badge, the sentence, then Send and Change.
function NextMission({
  persona,
  name,
  busy,
}: Readonly<{ persona: string; name: string; busy: boolean }>) {
  const { data, problem } = useMissionIdea(persona);
  const idea = data?.mission ?? null;
  // The words as changed here; none while they are the kobold's.
  const [words, setWords] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const sending = useSending(() => {
    setWords(null);
    setChanging(false);
  });
  const task = (words ?? idea?.task ?? "").trim();
  return (
    <section
      aria-label="Send on a mission"
      className={cn(CARD, "grid gap-3 px-6 py-5")}
    >
      {idea ? (
        <IdeaWords
          idea={idea}
          name={name}
          words={words}
          changing={changing}
          onWords={setWords}
        />
      ) : (
        <NoIdeaYet name={name} problem={problem} />
      )}
      {sending.failed && (
        <p role="alert" className="text-[13px] text-destructive">
          {sending.failed}
        </p>
      )}
      <SendRow
        name={name}
        busy={busy}
        sending={sending.busy}
        ready={Boolean(idea && task)}
        changing={idea ? changing : null}
        onSend={() => {
          if (idea) sending.go(persona, { task, product: idea.product });
        }}
        onChange={() => {
          setChanging(!changing);
        }}
      />
    </section>
  );
}

// Send <name>, and Change (once there is a suggestion; Done while the
// words are being changed).
function SendRow({
  name,
  busy,
  sending,
  ready,
  changing,
  onSend,
  onChange,
}: Readonly<{
  name: string;
  busy: boolean;
  sending: boolean;
  ready: boolean;
  changing: boolean | null;
  onSend: () => void;
  onChange: () => void;
}>) {
  return (
    <div className="flex items-center gap-4">
      <Button
        size="pill"
        busy={sending}
        disabled={!ready || busy || sending}
        onClick={onSend}
      >
        <Send aria-hidden strokeWidth={2} className="size-[15px]" />
        {busy ? `${name} is on a mission` : `Send ${name}`}
      </Button>
      {changing !== null && (
        <button
          type="button"
          onClick={onChange}
          className="text-[13px] font-semibold text-blue"
        >
          {changing ? "Done" : "Change"}
        </button>
      )}
    </div>
  );
}

// Sending a persona: busy meanwhile, then done, or why it failed.
function useSending(onSent: () => void) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const go = (persona: string, idea: Pick<MissionIdea, "task" | "product">) => {
    setBusy(true);
    send(persona, idea).then(
      () => {
        setBusy(false);
        setFailed(null);
        onSent();
      },
      (error: unknown) => {
        setBusy(false);
        setFailed(messageOf(error));
      },
    );
  };
  return { busy, failed, go };
}

// Before the suggestion is there: the kobold thinking, or why it could not.
function NoIdeaYet({
  name,
  problem,
}: Readonly<{ name: string; problem: string | null }>) {
  return problem ? (
    <p role="alert" className="text-[13px] text-destructive">
      {problem}
    </p>
  ) : (
    <p className="flex items-center gap-2 text-[14px] text-muted-foreground">
      <KoboldHead size={22} />
      The kobold is thinking of a mission for {name}…
    </p>
  );
}

// The mission's words: the kobold's, marked Suggested, or changed here.
function IdeaWords({
  idea,
  name,
  words,
  changing,
  onWords,
}: Readonly<{
  idea: MissionIdea;
  name: string;
  words: string | null;
  changing: boolean;
  onWords: (words: string) => void;
}>) {
  return (
    <>
      {words === null && (
        <span
          title={`Suggested by the kobold from who ${name} is`}
          className="flex items-center gap-2"
        >
          <KoboldHead size={22} />
          <span className="inline-flex h-[22px] items-center rounded-full bg-blue/10 px-2.5 text-[12px] font-medium text-blue">
            Suggested
          </span>
          {idea.app && (
            <span className="text-[12.5px] text-muted-foreground">
              in {idea.app}
            </span>
          )}
        </span>
      )}
      {changing ? (
        <textarea
          aria-label="The mission"
          value={words ?? idea.task}
          rows={3}
          autoFocus
          onChange={(event) => {
            onWords(event.target.value);
          }}
          className="w-full resize-none rounded-[10px] border border-input bg-card px-3 py-2 text-[15px] leading-normal outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      ) : (
        <p className="max-w-[640px] text-[18px] leading-snug font-medium tracking-[-0.01em]">
          {(words ?? idea.task).trim()}
        </p>
      )}
    </>
  );
}
