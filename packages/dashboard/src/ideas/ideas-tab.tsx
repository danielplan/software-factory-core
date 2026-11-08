import { useEffect, useState } from "react";

import { messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import type { FactoryState } from "@/dashboard/dashboard";

import { Answer } from "@/setup-coach/answer-box";
import { VoiceCall } from "@/voice/voice-call";

import { IdeaCard } from "./idea-card";
import { IdeaWorkspace } from "./idea-workspace";

// Where work starts: one big box in the middle of the screen to say what
// to build next, and the ideas so far below it, newest first; one open in its workspace (#ideas/<id>).
export function IdeasTab({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const idea = state.ideas.find((one) => one.id === open);
  if (idea) return <IdeaWorkspace idea={idea} />;
  return (
    <div className="grid gap-12">
      <div className="grid min-h-[calc(100vh-8rem)] content-center">
        <NewIdea />
      </div>
      {state.ideas.length > 0 && (
        <section aria-label="Your ideas" className="grid gap-3">
          <h2 className="px-1 text-sm font-medium">Your ideas</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.ideas.map((one) => (
              <IdeaCard key={one.id} idea={one} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// The idea in a sentence, typed or said out loud (Talk), which starts it
// and opens it.
function NewIdea() {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const start = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    setProblem(null);
    try {
      const { id } = await post<{ id: string }>("/api/ideas", { text });
      window.location.hash = `ideas/${id}`;
    } catch (error) {
      setProblem(messageOf(error));
      setBusy(false);
    }
  };
  const call = useStartCall(start);
  return (
    <section
      aria-label="A new idea"
      className="mx-auto grid w-full max-w-[720px] gap-5"
    >
      <h1 className="text-center text-[34px] font-semibold tracking-[-0.02em]">
        What should we build next?
      </h1>
      <Answer
        call={call}
        coach={{ working: busy, problem }}
        onSay={(text) => void start(text)}
        placeholder="A wish list, so customers can save what they like for later…"
        big
      />
      {problem && <ProblemBox title="That did not work" text={problem} />}
    </section>
  );
}

// Talking instead of typing: what is said starts the idea.
function useStartCall(start: (text: string) => Promise<void>): VoiceCall {
  const [call] = useState(() => new VoiceCall());
  useEffect(() => {
    call.sendTo(async (text) => {
      await start(text);
    });
  });
  useEffect(
    () => () => {
      call.end();
    },
    [call],
  );
  return call;
}
