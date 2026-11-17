// "New exploration", in a small dialog: an idea of the team's, no signal
// needed; what it is, the problem, and who it is for. It waits to be
// started.

import { useState } from "react";

import { messageOf, type PersonaRow, post } from "@/api";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type Read, useRead } from "@/understand/use-records";

export function NewExploration({
  open,
  onClose,
}: Readonly<{ open: boolean; onClose: () => void }>) {
  const { data } = useRead("/api/kobble/personas") as Read<{
    personas: PersonaRow[];
  }>;
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [persona, setPersona] = useState("");
  const [refused, setRefused] = useState<string | undefined>();
  const add = () => {
    post("/api/kobble/explorations", {
      title,
      problem,
      ...(persona ? { persona } : {}),
    }).then(
      () => {
        setTitle("");
        setProblem("");
        onClose();
      },
      (error: unknown) => {
        setRefused(messageOf(error));
      },
    );
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(now) => {
        if (!now) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogTitle>New exploration</DialogTitle>
        <DialogDescription>
          An idea of the team's. It waits until someone starts it.
        </DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <Field label="What to explore" id="x-title" problem={refused}>
            <Input
              id="x-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
            />
          </Field>
          <More
            problem={problem}
            persona={persona}
            personas={data?.personas ?? []}
            onProblem={setProblem}
            onPersona={setPersona}
          />
          <Button
            type="submit"
            size="pill"
            className="w-fit"
            disabled={!title.trim()}
          >
            Add exploration
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function More({
  problem,
  persona,
  personas,
  onProblem,
  onPersona,
}: Readonly<{
  problem: string;
  persona: string;
  personas: PersonaRow[];
  onProblem: (problem: string) => void;
  onPersona: (persona: string) => void;
}>) {
  return (
    <>
      <Field label="The problem" id="x-problem">
        <textarea
          id="x-problem"
          rows={3}
          value={problem}
          onChange={(event) => {
            onProblem(event.target.value);
          }}
          className="w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </Field>
      <Field label="For" id="x-persona">
        <select
          id="x-persona"
          value={persona}
          onChange={(event) => {
            onPersona(event.target.value);
          }}
          className="h-9 rounded-[10px] border border-input bg-card px-3 text-sm"
        >
          <option value="">No persona yet</option>
          {personas.map((one) => (
            <option key={one.id} value={one.id}>
              {one.name}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}
