// "New persona", in a small dialog: their kobold (picked from the name;
// Shuffle picks another), a name, where they are, and a few words about who
// they are. Someone on the team adds them ("Added by you").

import { useState } from "react";

import {
  type Face,
  faceFor,
  messageOf,
  PERSONA_COLORS,
  PERSONA_HATS,
  post,
} from "@/api";
import { FIELD_AREA } from "@/lib/field-style";
import { PersonaFace } from "@/components/kobold-face";
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

// The next face for Shuffle: a stride through every hat and colour that
// visits them all before it comes back, so it feels picked by chance.
const ALL = PERSONA_HATS.length * PERSONA_COLORS.length;
const STRIDE = 5;

function shuffled(face: Face): Face {
  const at =
    PERSONA_HATS.indexOf(face.hat) +
    PERSONA_HATS.length * PERSONA_COLORS.indexOf(face.color);
  const next = (at + STRIDE) % ALL;
  return {
    hat: PERSONA_HATS[next % PERSONA_HATS.length] ?? face.hat,
    color: PERSONA_COLORS[Math.floor(next / PERSONA_HATS.length)] ?? face.color,
  };
}

export function NewPersona({
  open,
  onClose,
}: Readonly<{ open: boolean; onClose: () => void }>) {
  const [values, setValues] = useState<Values>(EMPTY);
  // Picked by Shuffle; until then the face follows the name.
  const [picked, pick] = useState<Face | null>(null);
  const face = picked ?? faceFor(values.name.trim().toLowerCase() || "new");
  const [problem, setProblem] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const add = () => {
    setBusy(true);
    post<{ persona: { id: string } }>("/api/kobble/personas", {
      ...values,
      face,
    }).then(
      ({ persona }) => {
        setBusy(false);
        setValues(EMPTY);
        pick(null);
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
          <div className="flex items-center gap-4">
            <PersonaFace face={face} size={64} />
            <Button
              type="button"
              variant="ring"
              size="pill-sm"
              onClick={() => {
                pick(shuffled(face));
              }}
            >
              Shuffle
            </Button>
          </div>
          <Fields
            values={values}
            problem={problem}
            onChange={(change) => {
              setValues({ ...values, ...change });
            }}
          />
          <Button
            type="submit"
            size="pill"
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
          className={FIELD_AREA}
          onChange={(event) => {
            onChange({ about: event.target.value });
          }}
        />
      </Field>
    </>
  );
}
