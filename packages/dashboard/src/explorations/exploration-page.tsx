// One exploration: a bar at the top (back, its title, Drop, Hand off the
// agreed prototype), the canvas the kobold and the team work on (left), and
// the conversation with the kobold (right). Opening one that waits starts
// it.

import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { type ExplorationPage as Page, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { type Read, useRead } from "@/understand/use-records";

import { Board } from "./board/canvas";
import { BoardProblem } from "./board/frame";
import { TalkPanel } from "./talk-panel";

export function ExplorationPage({ id }: Readonly<{ id: string }>) {
  const { data, problem } = useRead(
    `/api/kobble/exploration?id=${encodeURIComponent(id)}`,
  ) as Read<Page>;
  const [said, say] = useState<string | null>(null);
  // The things a person attached to what they type next.
  const [attached, setAttached] = useState<string[]>([]);
  const waiting = data?.exploration.status === "waiting";
  useEffect(() => {
    if (waiting)
      post("/api/kobble/explorations/start", { id }).catch((error: unknown) => {
        say(messageOf(error));
      });
  }, [waiting, id]);
  if (!data)
    return problem ? (
      <ProblemBox title="This exploration cannot be read" text={problem} />
    ) : null;
  const press = (path: string, body: object) => {
    say(null);
    post(`/api/kobble/explorations/${path}`, { id, ...body }).catch(
      (error: unknown) => {
        say(messageOf(error));
      },
    );
  };
  return (
    <div className="flex h-dvh flex-col max-md:h-[calc(100dvh-56px)]">
      <TopBar page={data} press={press} />
      {said && (
        <div className="px-6 pt-3">
          <ProblemBox title="That did not work" text={said} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        <BoardProblem value={say}>
          <Board
            page={data}
            attached={attached}
            onPick={(thing) => {
              setAttached((now) =>
                now.includes(thing)
                  ? now.filter((one) => one !== thing)
                  : [...now, thing],
              );
            }}
          />
        </BoardProblem>
        <TalkPanel
          page={data}
          attached={attached}
          onSent={() => {
            setAttached([]);
          }}
          onDetach={(thing) => {
            setAttached((now) => now.filter((one) => one !== thing));
          }}
        />
      </div>
    </div>
  );
}

function TopBar({
  page,
  press,
}: Readonly<{ page: Page; press: (path: string, body: object) => void }>) {
  const { exploration, board } = page;
  const open = ["waiting", "exploring"].includes(exploration.status);
  const agreed = board.things.find(
    (one) => one.kind === "prototype" && one.agreed,
  );
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-6 py-4">
      <a
        href="#explore"
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue"
      >
        <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
        Explorations
      </a>
      <span className="text-[12.5px] text-muted-foreground">/</span>
      <span className="min-w-0 flex-1 text-[17px] font-semibold">
        {exploration.title}
      </span>
      {open ? (
        <>
          <Button
            variant="ring"
            size="pill-sm"
            onClick={() => {
              press("drop", {});
            }}
          >
            Drop
          </Button>
          <Button
            size="pill-sm"
            disabled={!agreed}
            onClick={() => {
              press("hand-off", {});
            }}
          >
            Hand off {agreed?.kind === "prototype" ? agreed.key : ""}
          </Button>
        </>
      ) : (
        <span className="inline-flex h-[26px] items-center rounded-full bg-wash px-2.5 text-xs font-medium text-wash-foreground">
          {exploration.work
            ? `Handed off as #${String(exploration.work)}`
            : "Dropped"}
        </span>
      )}
    </div>
  );
}
