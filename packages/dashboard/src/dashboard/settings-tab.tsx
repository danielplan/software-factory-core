import { useState } from "react";

import { type GroupView, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/setup/company-step";
import { TRACKER_NAMES } from "@/setup/draft";

import type { FactoryState } from "./dashboard";

// A secret the server says is set; its value is never sent to the page.
const SECRET_SET = "(set)";

export function SettingsTab({ state }: Readonly<{ state: FactoryState }>) {
  const { company } = state;
  return (
    <div className="grid gap-5">
      <section
        className="grid gap-2 rounded-xl border bg-card p-4"
        aria-label="Company"
      >
        <h2 className="font-semibold">{company.name}</h2>
        {company.about && (
          <p className="text-muted-foreground">{company.about}</p>
        )}
        <dl className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">Work tracked in</dt>
          <dd>{TRACKER_NAMES[company.tracker]}</dd>
          <dt className="text-muted-foreground">Factory folder</dt>
          <dd className="break-all">{state.root}</dd>
        </dl>
      </section>
      {state.settings.map((group) => (
        <GroupForm key={group.id} group={group} />
      ))}
    </div>
  );
}

function GroupForm({ group }: Readonly<{ group: GroupView }>) {
  const form = useGroupForm(group.id);
  return (
    <section
      className="grid gap-4 rounded-xl border bg-card p-4"
      aria-label={group.name}
    >
      <header className="grid gap-1">
        <h2 className="font-semibold">{group.name}</h2>
        <p className="text-sm text-muted-foreground">{group.about}</p>
        <p className="text-xs text-muted-foreground">Saved in {group.file}</p>
      </header>
      <div className="grid max-w-xl gap-4">
        {group.fields.map((field) => (
          <SettingInput
            key={field.key}
            id={`${group.id}-${field.key}`}
            field={field}
            typed={form.values[field.key]}
            problem={form.refused[field.key]}
            onType={(value) => {
              form.type(field.key, value);
            }}
          />
        ))}
      </div>
      {form.problem && <ProblemBox title="Not saved" text={form.problem} />}
      <div className="flex items-center gap-3">
        <Button onClick={() => void form.save()} disabled={!form.changed}>
          Save
        </Button>
        {form.saved && <span className="text-sm text-success">Saved.</span>}
      </div>
    </section>
  );
}

// What the owner typed in a group's form, and saving it: the server says
// which values it refused, and why.
function useGroupForm(group: string) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [refused, setRefused] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setProblem(null);
    setSaved(false);
    try {
      const answer = await post<{ refused: Record<string, string> }>(
        "/api/settings",
        { group, values },
      );
      setRefused(answer.refused);
      if (Object.keys(answer.refused).length === 0) {
        setValues({});
        setSaved(true);
      }
    } catch (error) {
      setProblem(messageOf(error));
    }
  };
  const type = (key: string, value: string) => {
    setValues({ ...values, [key]: value });
  };
  const changed = Object.keys(values).length > 0;
  return { values, refused, problem, saved, save, type, changed };
}

type SettingView = GroupView["fields"][number];

// One setting: a choice, or text (a secret as a password, never shown).
function SettingInput({
  id,
  field,
  typed,
  problem,
  onType,
}: Readonly<{
  id: string;
  field: SettingView;
  typed: string | undefined;
  problem: string | undefined;
  onType: (value: string) => void;
}>) {
  const { label, help, shown } = describe(field, typed);
  return (
    <Field id={id} label={label} help={help} {...(problem ? { problem } : {})}>
      {field.kind === "choice" ? (
        <select
          id={id}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={shown}
          onChange={(event) => {
            onType(event.target.value);
          }}
        >
          {field.choices?.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          type={field.kind === "secret" ? "password" : "text"}
          inputMode={field.kind === "number" ? "numeric" : undefined}
          autoComplete="off"
          placeholder={field.default ?? ""}
          value={shown}
          onChange={(event) => {
            onType(event.target.value);
          }}
        />
      )}
    </Field>
  );
}

// A setting's label and help, and what its box shows: a secret that is set
// says so, and its box stays empty until a new one is typed.
function describe(field: SettingView, typed: string | undefined) {
  const secret = field.kind === "secret";
  const set = secret && field.value === SECRET_SET;
  return {
    label: set ? `${field.label} (set)` : field.label,
    help: set ? `${field.help} Type a new one to replace it.` : field.help,
    shown: typed ?? (secret ? "" : (field.value ?? "")),
  };
}
