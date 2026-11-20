// One exploration: a bar at the top (back, its title, Drop, Hand off the
// agreed prototype), the canvas the kobold and the team work on (left), and
// the conversation with the kobold (right). Opening one that waits starts
// it, and its prototype runs on the board by itself. Handed off or dropped,
// it closes.

import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type ExplorationPage as Page, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { type Read, useRead } from "@/lib/use-read";

import { Board } from "./board/canvas";
import { BoardProblem } from "./board/frame";
import { useLivePrototype } from "./board/live-prototype";
import { TalkPanel } from "./talk-panel";

export function ExplorationPage({ id }: Readonly<{ id: string }>) {
  const { data, problem } = useRead(
    `/api/kobble/exploration?id=${encodeURIComponent(id)}`,
  ) as Read<Page>;
  const [said, say] = useState<string | null>(null);
  // The things a person attached to what they type next.
  const [attached, setAttached] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const waiting = data?.exploration.status === "waiting";
  useEffect(() => {
    if (waiting)
      post("/api/kobble/explorations/start", { id }).catch((error: unknown) => {
        say(messageOf(error));
      });
  }, [waiting, id]);
  useLivePrototype(data);
  useClosed(data?.exploration.status);
  if (!data)
    return problem ? (
      <ProblemBox title="This exploration cannot be read" text={problem} />
    ) : null;
  const press = (path: string, body: object) => {
    say(null);
    setPending(path);
    post(`/api/kobble/explorations/${path}`, { id, ...body })
      .then(() => {
        // Handed off or dropped, it is done: back to the explorations.
        if (path === "hand-off" || path === "drop") location.hash = "#explore";
      })
      .catch((error: unknown) => {
        say(messageOf(error));
      })
      .finally(() => {
        setPending(null);
      });
  };
  return (
    <div className="flex h-dvh flex-col">
      <TopBar page={data} press={press} pending={pending} />
      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        <BoardProblem value={say}>
          {/* What did not work shows over the canvas only, not the talk. */}
          <div className="relative flex min-h-0 min-w-0 flex-1">
            {said && (
              <div className="absolute inset-x-4 top-4 z-10 rounded-xl bg-card shadow-card">
                <ProblemBox title="That did not work" text={said} />
              </div>
            )}
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
          </div>
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

// Handed off or dropped while open (by the kobold too), it closes: back to
// the explorations.
function useClosed(status: string | undefined): void {
  const was = useRef(status);
  useEffect(() => {
    const open = (one: string | undefined) =>
      one === "waiting" || one === "exploring";
    if (open(was.current) && status && !open(status))
      location.hash = "#explore";
    was.current = status;
  }, [status]);
}

function TopBar({
  page,
  press,
  pending,
}: Readonly<{
  page: Page;
  press: (path: string, body: object) => void;
  // The button whose work runs now.
  pending: string | null;
}>) {
  const { exploration, board } = page;
  const open = ["waiting", "exploring"].includes(exploration.status);
  const agreed = board.things.find(
    (one) => one.kind === "prototype" && one.agreed,
  );
  const key = agreed?.kind === "prototype" ? agreed.key : "";
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
      <span className="min-w-0 flex-1 text-[15px] font-semibold">
        {exploration.title}
      </span>
      {open ? (
        <>
          <Button
            variant="ring"
            size="pill-sm"
            busy={pending === "drop"}
            disabled={pending !== null}
            onClick={() => {
              press("drop", {});
            }}
          >
            {pending === "drop" ? "Dropping…" : "Drop"}
          </Button>
          <Button
            size="pill-sm"
            busy={pending === "hand-off"}
            disabled={!agreed || pending !== null}
            onClick={() => {
              press("hand-off", {});
            }}
          >
            {pending === "hand-off" ? "Handing off…" : `Hand off ${key}`}
          </Button>
        </>
      ) : (
        <span className="inline-flex h-[22px] items-center rounded-md bg-wash px-2.5 text-xs font-medium text-wash-foreground">
          {exploration.work
            ? `Handed off as #${String(exploration.work)}`
            : "Dropped"}
        </span>
      )}
    </div>
  );
}
