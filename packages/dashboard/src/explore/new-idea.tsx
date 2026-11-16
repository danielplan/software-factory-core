// "New idea", in a dialog: from a story where something breaks (the idea is
// for its problem and its persona), or your own idea, for which the kobold
// writes the story it assumes (own-idea.tsx). "Start an idea" on a story in
// Understand opens it with that story picked (#explore/new/<story>).

import { useState } from "react";

import { type ExploreList, messageOf, post } from "@/api";
import { Field } from "@/components/field";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { exploreHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Initial } from "@/understand/bits";
import { tintOf } from "@/understand/view";

import { OwnIdea } from "./own-idea";

export function NewIdea({
  open,
  story,
  list,
  onClose,
}: Readonly<{
  open: boolean;
  story: string | null;
  list: ExploreList;
  onClose: () => void;
}>) {
  const [own, setOwn] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(now) => {
        if (!now) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>New idea</DialogTitle>
        <DialogDescription className="sr-only">
          Start an idea from a story, or from your own.
        </DialogDescription>
        <div
          role="group"
          aria-label="Start from"
          className="flex w-fit gap-1 rounded-xl bg-surface-2 p-1"
        >
          {[
            { own: false, name: "From a story" },
            { own: true, name: "My own idea" },
          ].map((tab) => (
            <button
              key={tab.name}
              type="button"
              aria-pressed={tab.own === own}
              onClick={() => {
                setOwn(tab.own);
              }}
              className={cn(
                "h-9 rounded-lg px-3.5 text-sm font-medium text-muted-foreground",
                tab.own === own && "bg-card text-foreground shadow-soft",
              )}
            >
              {tab.name}
            </button>
          ))}
        </div>
        {own ? (
          <OwnIdea personas={list.personas} />
        ) : (
          <FromStory list={list} picked={story} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FromStory({
  list,
  picked,
}: Readonly<{ list: ExploreList; picked: string | null }>) {
  const [story, setStory] = useState(picked);
  const [title, setTitle] = useState("");
  const [weThink, setWeThink] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const start = async () => {
    setProblem(null);
    try {
      const { idea } = await post<{ idea: { id: string } }>(
        "/api/explore/ideas",
        { story, title, ...(weThink.trim() ? { weThink } : {}) },
      );
      window.location.hash = exploreHash(idea.id);
    } catch (error) {
      setProblem(messageOf(error));
    }
  };
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void start();
      }}
    >
      <p className="text-sm text-muted-foreground">
        Pick a story where something breaks. The idea is for its problem.
      </p>
      <StoryChoices stories={list.stories} picked={story} onPick={setStory} />
      <Field label="The idea, in a few words" id="idea-title">
        <Input
          id="idea-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </Field>
      <Field
        label="We think… (optional)"
        id="idea-we-think"
        help="What it would do for them, in a sentence."
      >
        <Input
          id="idea-we-think"
          value={weThink}
          onChange={(event) => {
            setWeThink(event.target.value);
          }}
        />
      </Field>
      {problem && <ProblemBox title="It could not be started" text={problem} />}
      <Button
        type="submit"
        className="w-fit"
        disabled={!story || !title.trim()}
      >
        Start the idea
      </Button>
    </form>
  );
}

function StoryChoices({
  stories,
  picked,
  onPick,
}: Readonly<{
  stories: ExploreList["stories"];
  picked: string | null;
  onPick: (story: string) => void;
}>) {
  return (
    <div className="grid max-h-72 gap-1.5 overflow-y-auto">
      {stories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No story breaks at an open problem yet.
        </p>
      )}
      {stories.map((one) => (
        <button
          key={one.id}
          type="button"
          aria-pressed={one.id === picked}
          onClick={() => {
            onPick(one.id);
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3 py-2 text-left hover:bg-surface",
            one.id === picked && "border-foreground ring-1 ring-foreground",
          )}
        >
          <Initial name={one.persona.name} tint={tintOf(one.persona.at)} />
          <span className="grid">
            <span className="text-sm font-medium">{one.title}</span>
            <span className="text-xs text-muted-foreground">
              Breaks: {one.problem.title}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
