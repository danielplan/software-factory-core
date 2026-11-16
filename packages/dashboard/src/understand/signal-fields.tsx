// The fields of "Add a source": what came in (typed, pasted or from a
// file), its source (or a new one, with its kind), who said it, and when.

import type { Customer, Source } from "@/api";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// The choices that are not a source or a customer.
export const NEW_SOURCE = "new";
export const NOBODY = "nobody";

export type Said = {
  text: string;
  source: string;
  // A new source's name and kind.
  name: string;
  kind: Source["kind"];
  who: string;
  when: string;
};

const KINDS: { kind: Source["kind"]; name: string }[] = [
  { kind: "people", name: "What people say or write" },
  { kind: "usage", name: "How people use it" },
  { kind: "errors", name: "Errors" },
  { kind: "alerts", name: "Alerts, such as security updates" },
  { kind: "personaRuns", name: "Runs by a persona (never evidence)" },
];

export function today(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function SignalFields({
  said,
  onChange,
  sources,
  customers,
}: Readonly<{
  said: Said;
  onChange: (said: Said) => void;
  sources: Source[];
  customers: Customer[];
}>) {
  const set = (change: Partial<Said>) => {
    onChange({ ...said, ...change });
  };
  return (
    <>
      <Field
        label="What came in"
        id="signal-text"
        help="One thing one person said or did."
      >
        <textarea
          id="signal-text"
          value={said.text}
          rows={5}
          onChange={(event) => {
            set({ text: event.target.value });
          }}
          className="w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </Field>
      <Field label="Or take it from a file" id="signal-file">
        <Input
          id="signal-file"
          type="file"
          accept=".txt,.md,.eml,.csv,text/*"
          onChange={(event) => {
            void event.target.files?.[0]?.text().then((text) => {
              set({ text });
            });
          }}
        />
      </Field>
      <Field label="Where it came from" id="signal-source">
        <Select
          value={said.source}
          onValueChange={(source) => {
            set({ source });
          }}
        >
          <SelectTrigger id="signal-source" className="w-full bg-card">
            <SelectValue placeholder="Pick a source" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
            <SelectItem value={NEW_SOURCE}>A new source…</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {said.source === NEW_SOURCE && <NewSource said={said} set={set} />}
      <WhoAndWhen said={said} set={set} customers={customers} />
    </>
  );
}

function WhoAndWhen({
  said,
  set,
  customers,
}: Readonly<{
  said: Said;
  set: (change: Partial<Said>) => void;
  customers: Customer[];
}>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Who said it" id="signal-who">
        <Select
          value={said.who}
          onValueChange={(who) => {
            set({ who });
          }}
        >
          <SelectTrigger id="signal-who" className="w-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NOBODY}>Not known</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="When" id="signal-when">
        <Input
          id="signal-when"
          value={said.when}
          onChange={(event) => {
            set({ when: event.target.value });
          }}
        />
      </Field>
    </div>
  );
}

function NewSource({
  said,
  set,
}: Readonly<{ said: Said; set: (change: Partial<Said>) => void }>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="The new source's name" id="source-name">
        <Input
          id="source-name"
          value={said.name}
          placeholder="Support inbox"
          onChange={(event) => {
            set({ name: event.target.value });
          }}
        />
      </Field>
      <Field label="What it is" id="source-kind">
        <Select
          value={said.kind}
          onValueChange={(kind) => {
            set({ kind: kind as Source["kind"] });
          }}
        >
          <SelectTrigger id="source-kind" className="w-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.kind} value={k.kind}>
                {k.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
