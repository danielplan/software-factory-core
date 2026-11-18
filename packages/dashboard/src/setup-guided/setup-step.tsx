// The last step: Kobble sets itself up. Before, the kobold says whether
// everything for it is there; pressing Set up has it write the factory, with
// its jobs ticking off as they finish; then Open Kobble.

import type { State } from "@/api";
import { SetupAction } from "@/setup-coach/setup-action";
import type { VoiceCall } from "@/voice/voice-call";

type SetupState = Extract<State, { mode: "setup" }>;

export function SetupStep({
  state,
  says,
  call,
}: Readonly<{ state: SetupState; says: React.ReactNode; call: VoiceCall }>) {
  const { coach, jobs } = state;
  return (
    <>
      <header className="grid gap-1.5">
        <h1 className="text-[30px] leading-tight font-bold tracking-tight">
          {wordsOf(coach).title}
        </h1>
        <p className="text-muted-foreground">{wordsOf(coach).lead}</p>
      </header>
      {says}
      {jobs.length > 0 && (
        <ul className="grid gap-1 rounded-2xl bg-card p-2 shadow-card">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <span className={`size-2.5 rounded-full ${DOT[job.state]}`} />
              {job.label}
            </li>
          ))}
        </ul>
      )}
      <div className="max-w-sm">
        <SetupAction
          coach={coach}
          onPress={() => {
            call.end();
          }}
        />
      </div>
    </>
  );
}

const DOT: Record<SetupState["jobs"][number]["state"], string> = {
  done: "bg-[#12a594]",
  failed: "bg-destructive",
  working: "animate-pulse bg-warning",
  waiting: "bg-muted",
};

function wordsOf(coach: SetupState["coach"]): { title: string; lead: string } {
  if (coach.made)
    return {
      title: "Kobble is set up",
      lead: "Everything is in place, in your repository. Open Kobble to start.",
    };
  if (coach.phase === "build")
    return {
      title: "Setting up Kobble",
      lead: "The kobold writes everything we went through into your repository. This takes a few minutes.",
    };
  return {
    title: "Set up",
    lead: coach.draft.ready
      ? "Everything is there. Kobble writes it into your repository when you press the button."
      : "The kobold says when everything for setting up is there; ask it what is missing.",
  };
}
