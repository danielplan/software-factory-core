import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { type IdeaView, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { attachedNames } from "@/setup-coach/canvas";
import { useCoachCall } from "@/setup-coach/coach-call";
import { CoachChat } from "@/setup-coach/coach-chat";
import { CoachRouteContext } from "@/setup-coach/route";
import { SetupCanvas } from "@/setup-coach/setup-canvas";

// One idea, as setup is: its map filling the window and the conversation
// with the idea coach docked at the side, its title and Ready above the
// map. Ready marks the plan as agreed.
export function IdeaWorkspace({ idea }: Readonly<{ idea: IdeaView }>) {
  const route = {
    say: "/api/ideas/say",
    draft: "/api/ideas/draft",
    with: { id: idea.id },
  };
  return (
    <CoachRouteContext value={route}>
      <Workspace idea={idea} />
    </CoachRouteContext>
  );
}

function Workspace({ idea }: Readonly<{ idea: IdeaView }>) {
  const [attached, setAttached] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const call = useCoachCall(idea, attached, () => {
    setAttached([]);
  });
  return (
    <div className="glow-page fixed inset-0 z-20 sm:left-[88px]">
      <SetupCanvas
        draft={idea.draft}
        attached={attached}
        onPick={(id) => {
          setAttached((now) =>
            now.includes(id) ? now.filter((a) => a !== id) : [...now, id],
          );
        }}
        onProblem={setProblem}
      />
      <div className="pointer-events-none absolute inset-0 grid grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_minmax(0,1fr)]">
        <Bar idea={idea} onProblem={setProblem} />
        <CoachChat
          className="pointer-events-auto h-[42vh] lg:row-span-2 lg:h-full"
          coach={idea}
          call={call}
          attached={attachedNames(idea.draft, attached)}
          onUnpick={(id) => {
            setAttached((now) => now.filter((a) => a !== id));
          }}
          onSent={() => {
            setAttached([]);
          }}
        />
        <div className="flex flex-col justify-end">
          {problem && (
            <div className="pointer-events-auto max-w-2xl">
              <ProblemBox title="That did not work" text={problem} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Back to the board, the idea's title and how far it is, Ready and Discard.
function Bar({
  idea,
  onProblem,
}: Readonly<{ idea: IdeaView; onProblem: (problem: string | null) => void }>) {
  const press = (path: string) => () => {
    onProblem(null);
    post(path, { id: idea.id })
      .then(() => {
        if (path.endsWith("discard")) window.location.hash = "board";
      })
      .catch((error: unknown) => {
        onProblem(messageOf(error));
      });
  };
  const ready = idea.status === "ready";
  return (
    <div className="pointer-events-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-2xl bg-card/90 p-1.5 pr-2 shadow-soft backdrop-blur">
      <Button asChild variant="ghost" className="h-9 px-2.5 text-[13px]">
        <a href="#board">
          <ArrowLeft aria-hidden /> Board
        </a>
      </Button>
      <span className="max-w-[28rem] truncate px-1 text-[15px] font-medium">
        {idea.title}
      </span>
      {ready ? (
        <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
          Ready
        </span>
      ) : (
        <Button
          className="h-9 px-3.5 text-[13px]"
          disabled={idea.working || idea.draft.cards.length === 0}
          onClick={press("/api/ideas/ready")}
        >
          Ready
        </Button>
      )}
      <Button
        variant="ghost"
        className="h-9 px-2.5 text-[13px] text-muted-foreground"
        onClick={() => {
          if (window.confirm("Discard this idea? It cannot be brought back."))
            press("/api/ideas/discard")();
        }}
      >
        Discard
      </Button>
    </div>
  );
}
