import { useState } from "react";

import type { State } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import type { VoiceCall } from "@/voice/voice-call";

import { attachedNames } from "./canvas";
import { useCoachCall } from "./coach-call";
import { CoachChat, CoachStart } from "./coach-chat";
import { SetupAction } from "./setup-action";
import { SetupCanvas } from "./setup-canvas";

type SetupState = Extract<State, { mode: "setup" }>;

// Setting up the project's factory by talking or typing: one conversation
// and one canvas, where the coach draws the project as it understands it.
// A project with code is read first, straight away; a new one starts with
// nothing but a chat prompt in the middle. Once the coach is at work,
// the canvas fills the window and the conversation floats on it, docked at
// the side; the factory is built and opened from there.
// Pieces clicked on the canvas are attached to the owner's next message.
export function SetupPage({ state }: Readonly<{ state: SetupState }>) {
  const [attached, setAttached] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const call = useCoachCall(state.coach, attached, () => {
    setAttached([]);
  });
  const { coach } = state;
  return (
    <div className="glow-page fixed inset-0">
      {coach.started && (
        <SetupCanvas
          draft={coach.draft}
          attached={attached}
          onPick={(id) => {
            setAttached((now) =>
              now.includes(id) ? now.filter((a) => a !== id) : [...now, id],
            );
          }}
          onProblem={setProblem}
        />
      )}
      {coach.started ? (
        <Docked
          state={state}
          call={call}
          attached={attached}
          setAttached={setAttached}
          problem={problem}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-4">
          <CoachStart coach={coach} call={call} />
        </div>
      )}
    </div>
  );
}

// After the first answer: the conversation docked at the right (below on a
// phone), with the button that makes the factory once it can be made, and
// what went wrong on the canvas, if anything, at the bottom left.
function Docked({
  state,
  call,
  attached,
  setAttached,
  problem,
}: Readonly<{
  state: SetupState;
  call: VoiceCall;
  attached: string[];
  setAttached: React.Dispatch<React.SetStateAction<string[]>>;
  problem: string | null;
}>) {
  const { coach } = state;
  return (
    <div className="pointer-events-none absolute inset-0 grid grid-rows-[minmax(0,1fr)_auto] gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-1">
      <div className="flex min-h-0 flex-col justify-end">
        {problem && (
          <div className="pointer-events-auto max-w-2xl">
            <ProblemBox title="That did not work" text={problem} />
          </div>
        )}
      </div>
      <CoachChat
        className="pointer-events-auto h-[42vh] lg:h-full"
        coach={coach}
        call={call}
        attached={attachedNames(coach.draft, attached)}
        onUnpick={(id) => {
          setAttached((now) => now.filter((a) => a !== id));
        }}
        onSent={() => {
          setAttached([]);
        }}
      >
        <SetupAction
          coach={coach}
          onPress={() => {
            call.end();
          }}
        />
      </CoachChat>
    </div>
  );
}
