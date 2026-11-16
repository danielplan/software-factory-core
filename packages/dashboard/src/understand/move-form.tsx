// Where a person moves a signal: into a scene of another story, a new
// story (the kobold writes it, for a persona if one is picked), or Build,
// as a bug.

import { useState } from "react";

import { messageOf, post, type RecordsView, type SignalView } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useAllRecords } from "./use-records";

type To = "scene" | "newStory" | "build";
const CHOICES: { to: To; name: string }[] = [
  { to: "scene", name: "Into a story" },
  { to: "newStory", name: "A new story" },
  { to: "build", name: "It's a bug" },
];
// No persona picked: the kobold decides.
const ANYONE = "anyone";

type Picked = { to: To; story: string; scene: string; persona: string };

// Where to, as the server takes it.
function whereTo(picked: Picked) {
  const { to, story, scene, persona } = picked;
  if (to === "scene") return { to, story, scene: Number(scene) };
  if (to === "newStory" && persona !== ANYONE) return { to, persona };
  return { to };
}

export function MoveForm({
  signal,
  onMoved,
}: Readonly<{ signal: SignalView; onMoved: () => void }>) {
  const records = useAllRecords().data?.records;
  const [picked, setPicked] = useState<Picked>({
    to: "scene",
    story: "",
    scene: "1",
    persona: ANYONE,
  });
  const [problem, setProblem] = useState<string | null>(null);
  const pick = (change: Partial<Picked>) => {
    setPicked({ ...picked, ...change });
  };
  const move = async () => {
    setProblem(null);
    try {
      await post("/api/understand/move", {
        signal: signal.id,
        to: whereTo(picked),
      });
      onMoved();
    } catch (error) {
      setProblem(messageOf(error));
    }
  };
  return (
    <div className="grid gap-3 rounded-xl bg-surface px-3 py-3">
      <Choices
        to={picked.to}
        onPick={(to) => {
          pick({ to });
        }}
      />
      {picked.to === "scene" && records && (
        <StoryAndScene records={records} picked={picked} pick={pick} />
      )}
      {picked.to === "newStory" && records && (
        <Whose records={records} persona={picked.persona} pick={pick} />
      )}
      <Button
        size="sm"
        className="w-fit"
        disabled={picked.to === "scene" && !picked.story}
        onClick={() => void move()}
      >
        {picked.to === "newStory" ? "Ask the kobold to write it" : "Move it"}
      </Button>
      {problem && <ProblemBox title="It could not be moved" text={problem} />}
    </div>
  );
}

function Choices({
  to,
  onPick,
}: Readonly<{ to: To; onPick: (to: To) => void }>) {
  return (
    <div
      role="radiogroup"
      aria-label="Move it to"
      className="flex flex-wrap gap-1.5"
    >
      {CHOICES.map((choice) => (
        <button
          key={choice.to}
          type="button"
          role="radio"
          aria-checked={to === choice.to}
          onClick={() => {
            onPick(choice.to);
          }}
          className={cn(
            "h-8 rounded-full px-3 text-[13px]",
            to === choice.to
              ? "bg-foreground text-background"
              : "bg-card shadow-soft",
          )}
        >
          {choice.name}
        </button>
      ))}
    </div>
  );
}

type Records = RecordsView["records"];

function StoryAndScene({
  records,
  picked,
  pick,
}: Readonly<{
  records: Records;
  picked: Picked;
  pick: (change: Partial<Picked>) => void;
}>) {
  const stories = records.stories.filter((s) => s.wrong === null);
  const nameOf = (id: string) =>
    records.personas.find((p) => p.id === id)?.name ?? id;
  const scenes = stories.find((s) => s.id === picked.story)?.scenes ?? [];
  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={picked.story}
        onValueChange={(story) => {
          pick({ story, scene: "1" });
        }}
      >
        <SelectTrigger className="min-w-56 bg-card" aria-label="The story">
          <SelectValue placeholder="Which story" />
        </SelectTrigger>
        <SelectContent>
          {stories.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {nameOf(s.persona)} · {s.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {scenes.length > 0 && (
        <Select
          value={picked.scene}
          onValueChange={(scene) => {
            pick({ scene });
          }}
        >
          <SelectTrigger className="min-w-56 bg-card" aria-label="The scene">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {scenes.map((s, at) => (
              <SelectItem
                key={`${String(at)}-${s.text}`}
                value={String(at + 1)}
              >
                {at + 1}. {s.text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function Whose({
  records,
  persona,
  pick,
}: Readonly<{
  records: Records;
  persona: string;
  pick: (change: Partial<Picked>) => void;
}>) {
  return (
    <Select
      value={persona}
      onValueChange={(chosen) => {
        pick({ persona: chosen });
      }}
    >
      <SelectTrigger
        className="w-fit min-w-56 bg-card"
        aria-label="Whose story"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANYONE}>The kobold decides whose</SelectItem>
        {records.personas.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            A story of {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
