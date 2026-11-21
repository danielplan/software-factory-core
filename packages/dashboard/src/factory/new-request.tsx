// Prototype: a request typed by someone on the team, which lands in To do
// as a card (variants A and C).

import { Plus } from "lucide-react";
import { useState } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FIELD_AREA } from "@/lib/field-style";

import { type CardType, TypePicker } from "./card-type";

export type Request = { title: string; text: string; type: CardType | null };

export function NewRequest({
  words,
  onAdd,
}: Readonly<{ words: string; onAdd: (request: Request) => void }>) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState<CardType | null>("feature");
  const add = () => {
    onAdd({ title: title.trim(), text: text.trim(), type });
    setOpen(false);
    setTitle("");
    setText("");
    setType("feature");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="pill">
          <Plus aria-hidden strokeWidth={2.2} className="size-[15px]" />
          {words}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{words}</DialogTitle>
          <DialogDescription>
            It goes to To do as a card; the builder takes it from there.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim()) add();
          }}
        >
          <Field label="What should the factory make?" id="request-title">
            <Input
              id="request-title"
              autoFocus
              value={title}
              placeholder="Let customers download their invoice"
              onChange={(event) => {
                setTitle(event.target.value);
              }}
            />
          </Field>
          <Field
            label="Anything the builder should know"
            id="request-text"
            help="Who asked, where it matters, what it should not change."
          >
            <textarea
              id="request-text"
              rows={3}
              value={text}
              className={FIELD_AREA}
              onChange={(event) => {
                setText(event.target.value);
              }}
            />
          </Field>
          <TypePicker type={type} onPick={setType} />
          <DialogFooter>
            <Button type="submit" size="pill" disabled={!title.trim()}>
              Add to To do
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
