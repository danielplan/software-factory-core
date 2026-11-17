// "New persona", in a small dialog: a name, where they are, and a few words
// about who they are. Someone on the team adds them ("Added by you").

import { useState } from "react";

import { messageOf, post } from "@/api";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { personaHash } from "@/lib/routes";

type Values = { name: string; place: string; about: string };
const EMPTY: Values = { name: "", place: "", about: "" };

export function NewPersona({
  open,
  onClose,
}: Readonly<{ open: boolean; onClose: () => void }>) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [problem, setProblem] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const add = () => {
    setBusy(true);
    post<{ persona: { id: string } }>("/api/kobble/personas", values).then(
      ({ persona }) => {
        setBusy(false);
        setValues(EMPTY);
        onClose();
        window.location.hash = personaHash(persona.id);
      },
      (error: unknown) => {
        setBusy(false);
        setProblem(messageOf(error));
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
        <DialogTitle>New persona</DialogTitle>
        <DialogDescription>
          Someone who stands for some of the app's customers.
        </DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <Fields
            values={values}
            problem={problem}
            onChange={(change) => {
              setValues({ ...values, ...change });
            }}
          />
          <Button
            type="submit"
            className="w-fit"
            disabled={busy || !values.name.trim()}
          >
            Add persona
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Fields({
  values,
  problem,
  onChange,
}: Readonly<{
  values: Values;
  problem: string | undefined;
  onChange: (change: Partial<Values>) => void;
}>) {
  return (
    <>
      <Field label="Name" id="persona-name" problem={problem}>
        <Input
          id="persona-name"
          value={values.name}
          placeholder="Office manager"
          onChange={(event) => {
            onChange({ name: event.target.value });
          }}
        />
      </Field>
      <Field label="Where" id="persona-place">
        <Input
          id="persona-place"
          value={values.place}
          placeholder="Garden centre · 12 people"
          onChange={(event) => {
            onChange({ place: event.target.value });
          }}
        />
      </Field>
      <Field label="Who they are" id="persona-about">
        <textarea
          id="persona-about"
          value={values.about}
          rows={3}
          className="w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onChange={(event) => {
            onChange({ about: event.target.value });
          }}
        />
      </Field>
    </>
  );
}
