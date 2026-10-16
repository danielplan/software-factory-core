import { type ReactNode, useState } from "react";

import { type GroupView, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TRACKER_NAMES } from "@/setup/draft";

import { TrackerChoice } from "@/connect/connect-page";

import type { FactoryState } from "./dashboard";
import { SettingInput } from "./setting-input";

// The factory's settings, in order: a list of the sections at the side
// (when there is more than one),
// then one card each: where work is tracked (with only the chosen
// tracker's settings) and every other settings group. Each card shows what is set now and saves on
// its own; the parts that read it can be restarted from there.
export function SettingsTab({ state }: Readonly<{ state: FactoryState }>) {
  const trackers = new Set<string>(Object.keys(TRACKER_NAMES));
  const groups = state.settings.filter((group) => !trackers.has(group.id));
  const sections = [
    "Where work is tracked",
    ...groups.map((group) => group.name),
  ];
  return (
    <div className="grid gap-5">
      <h1 className="px-1 pt-1 text-[26px] font-semibold tracking-[-0.02em]">
        Settings
      </h1>
      <div
        className={
          sections.length > 1
            ? "grid items-start gap-6 lg:grid-cols-[12rem_minmax(0,48rem)]"
            : "grid max-w-3xl"
        }
      >
        {sections.length > 1 && <Sections names={sections} />}
        <div className="grid gap-5">
          <TrackerCard state={state} />
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} state={state} />
          ))}
        </div>
      </div>
    </div>
  );
}

// The settings' sections, to go to one.
function Sections({ names }: Readonly<{ names: string[] }>) {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-6 grid gap-0.5 max-lg:hidden"
    >
      {names.map((name) => (
        <button
          key={name}
          type="button"
          className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-card hover:text-foreground"
          onClick={() => {
            document
              .getElementById(sectionId(name))
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {name}
        </button>
      ))}
    </nav>
  );
}

// "Where work is tracked" → "settings-where-work-is-tracked".
function sectionId(name: string): string {
  return `settings-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

// Where work is tracked: the same choice and steps as right after setup,
// on the page; what was connected, once done.
function TrackerCard({ state }: Readonly<{ state: FactoryState }>) {
  const [done, setDone] = useState<string | null>(null);
  return (
    <Topic
      title="Where work is tracked"
      about={`Now: ${TRACKER_NAMES[state.company.tracker]}. Where the ideas you agree to become work to build.`}
    >
      <TrackerChoice current={state.company.tracker} onDone={setDone} />
      {done && <p className="text-sm font-medium text-success">{done}</p>}
    </Topic>
  );
}

function GroupCard({
  group,
  state,
}: Readonly<{ group: GroupView; state: FactoryState }>) {
  const form = useForm("/api/settings", (values) => ({
    group: group.id,
    values,
  }));
  return (
    <Topic title={group.name} about={group.about}>
      <Fields group={group} form={form} />
      <Saving
        form={form}
        changed={form.changed}
        usedBy={group.usedBy}
        state={state}
      />
    </Topic>
  );
}

function Topic({
  title,
  about,
  children,
}: Readonly<{ title: string; about: string; children: ReactNode }>) {
  return (
    <Card
      id={sectionId(title)}
      aria-label={title}
      className="scroll-mt-6 gap-5 shadow-soft"
    >
      <CardHeader>
        <CardTitle className="text-[17px]">{title}</CardTitle>
        <CardDescription>{about}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  );
}

type Form = ReturnType<typeof useForm>;

function Fields({ group, form }: Readonly<{ group: GroupView; form: Form }>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
  );
}

// Save, what came of it, and the parts that read these settings, to
// restart once saved.
function Saving({
  form,
  changed,
  usedBy,
  state,
}: Readonly<{
  form: Form;
  changed: boolean;
  usedBy: string[];
  state: FactoryState;
}>) {
  const running = state.parts.filter(
    (part) => usedBy.includes(part.id) && part.canStop,
  );
  return (
    <>
      {form.problem && <ProblemBox title="Not saved" text={form.problem} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void form.save()} disabled={!changed}>
          Save
        </Button>
        {form.saved && (
          <span className="text-sm text-success">
            Saved.{running.length > 0 && " It counts once restarted:"}
          </span>
        )}
        {form.saved &&
          running.map((part) => (
            <Button
              key={part.id}
              variant="outline"
              className="h-9 px-3 text-[13px]"
              onClick={() =>
                void post(`/api/parts/${encodeURIComponent(part.id)}/restart`)
              }
            >
              Restart {part.name}
            </Button>
          ))}
      </div>
    </>
  );
}

// What the owner typed in a card, and saving it: the server says which
// values it refused, and why.
function useForm(
  path: string,
  body: (values: Record<string, string>) => unknown,
) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [refused, setRefused] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setProblem(null);
    setSaved(false);
    try {
      const answer = await post<{ refused: Record<string, string> }>(
        path,
        body(values),
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
    setSaved(false);
  };
  const reset = () => {
    setValues({});
    setRefused({});
    setSaved(false);
  };
  const changed = Object.keys(values).length > 0;
  return { values, refused, problem, saved, save, type, reset, changed };
}
