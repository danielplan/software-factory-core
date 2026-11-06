import { LayoutGrid } from "lucide-react";
import { useState } from "react";

import { messageOf, post, type AddOnView, type Board } from "@/api";
import { lookOf } from "@/add-ons/looks";
import { TRACKER_STEPS } from "@/add-ons/trackers";
import { ProblemBox } from "@/components/problem-box";
import { ChoiceCard } from "@/components/choice-card";
import { Button } from "@/components/ui/button";

// The factory's own board: "none", as the company file says.
const OWN = {
  id: "none",
  icon: <LayoutGrid aria-hidden />,
  title: "The factory's own board",
  text: "Work stays here, on the board in this app. Nothing to connect.",
};

// Where work is tracked, right after setup: the choice and its steps, and
// once done, the way to the board.
export function ConnectPage({ trackers }: Readonly<{ trackers: AddOnView[] }>) {
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 pt-[8vh]">
      <header className="grid gap-2">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          Where should the factory keep its work?
        </h1>
        <p className="text-muted-foreground">
          The ideas you agree to become work on a board, and the factory builds
          from there. Keep it here, or use the board your team already has.
        </p>
      </header>
      {done ? (
        <section className="grid gap-4 rounded-3xl bg-card p-6 shadow-soft">
          <p className="text-[15px] font-medium text-success">{done}</p>
          <Button
            className="h-10 justify-self-start px-4"
            onClick={() => {
              window.location.hash = "board";
            }}
          >
            Go to the board
          </Button>
        </section>
      ) : (
        <TrackerChoice trackers={trackers} current="none" onDone={setDone} />
      )}
    </div>
  );
}

// The factory's own board, or a board of one of the tracker add-ons (those
// the page has steps for): the choices, and under the chosen one its
// steps, each checked. Used right after setup and on Settings.
export function TrackerChoice({
  trackers,
  current,
  connected,
  onDone,
}: Readonly<{
  trackers: AddOnView[];
  current: string;
  // The boards connected now, by tracker: their steps start from them.
  connected?: Board;
  onDone: (message: string) => void;
}>) {
  const [choice, setChoice] = useState(current);
  const choices = [
    OWN,
    ...trackers
      .filter((tracker) => TRACKER_STEPS[tracker.id])
      .map((tracker) => ({
        id: tracker.id,
        icon: lookOf(tracker.id).icon,
        title: tracker.name,
        text: tracker.about,
      })),
  ];
  const Steps = TRACKER_STEPS[choice];
  const [problem, setProblem] = useState<string | null>(null);
  // A tracker that is off is switched on to connect its board.
  const choose = (id: string) => {
    setProblem(null);
    const off = trackers.find((tracker) => tracker.id === id && !tracker.on);
    if (!off) {
      setChoice(id);
      return;
    }
    post("/api/add-ons", { id, on: true })
      .then(() => {
        setChoice(id);
      })
      .catch((error: unknown) => {
        setProblem(messageOf(error));
      });
  };
  const ownBoard = () => {
    setProblem(null);
    post("/api/connect/own-board")
      .then(() => {
        onDone("Work stays on the factory's own board.");
      })
      .catch((error: unknown) => {
        setProblem(messageOf(error));
      });
  };
  return (
    <div className="grid gap-5">
      <div
        className="grid gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Tracker"
      >
        {choices.map((one) => (
          <ChoiceCard
            key={one.id}
            chosen={choice === one.id}
            icon={one.icon}
            title={one.title}
            text={one.text}
            onChoose={() => {
              choose(one.id);
            }}
          />
        ))}
      </div>
      {choice === "none" && (
        <Button className="h-10 justify-self-start px-4" onClick={ownBoard}>
          Use the factory's board
        </Button>
      )}
      {Steps && <Steps onDone={onDone} connected={connected?.[choice]} />}
      {problem && <ProblemBox title="That did not work" text={problem} />}
    </div>
  );
}
