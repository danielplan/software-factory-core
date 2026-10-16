import { Ban, GitBranch, SquareKanban } from "lucide-react";
import { type ReactNode, useState } from "react";

import { type Company, type GroupView, messageOf, post } from "@/api";
import { Accent } from "@/components/accent";
import { ChoiceCard } from "@/components/choice-card";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { TRACKER_NAMES } from "@/setup/draft";

import type { FactoryState } from "./dashboard";
import { SettingInput } from "./setting-input";

type Tracker = Company["tracker"];

const TRACKER_ICONS: Record<Tracker, ReactNode> = {
  none: <Ban aria-hidden />,
  github: <GitBranch aria-hidden />,
  jira: <SquareKanban aria-hidden />,
};

const TRACKER_ABOUT: Record<Tracker, string> = {
  none: "Just the factory for now. You can choose later.",
  github: "Ideas become cards on a GitHub board.",
  jira: "Ideas become issues in a Jira Cloud project.",
};

// The factory's settings, one card per topic: where work is tracked (with
// only the chosen tracker's settings), every other settings group, and
// where each part answers. Each card shows what is set now and saves on
// its own; the parts that read it can be restarted from there.
export function SettingsTab({ state }: Readonly<{ state: FactoryState }>) {
  const trackers = new Set<string>(Object.keys(TRACKER_NAMES));
  return (
    <div className="grid max-w-3xl gap-5">
      <h1 className="px-1 pt-2 text-[30px] font-medium tracking-[-0.02em]">
        Your <Accent>settings</Accent>
      </h1>
      <TrackerCard state={state} />
      {state.settings
        .filter((group) => !trackers.has(group.id))
        .map((group) => (
          <GroupCard key={group.id} group={group} state={state} />
        ))}
      <Addresses state={state} />
    </div>
  );
}

function TrackerCard({ state }: Readonly<{ state: FactoryState }>) {
  const [tracker, setTracker] = useState<Tracker>(state.company.tracker);
  const group = state.settings.find((g) => g.id === tracker);
  const form = useForm("/api/company/tracker", (values) => ({
    tracker,
    settings: values,
  }));
  return (
    <Card
      title="Where work is tracked"
      about="Where the ideas you agree with the factory become work to build."
    >
      <div
        className="grid gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Tracker"
      >
        {(Object.keys(TRACKER_NAMES) as Tracker[]).map((one) => (
          <ChoiceCard
            key={one}
            chosen={tracker === one}
            icon={TRACKER_ICONS[one]}
            title={TRACKER_NAMES[one]}
            text={TRACKER_ABOUT[one]}
            onChoose={() => {
              setTracker(one);
              form.reset();
            }}
          />
        ))}
      </div>
      <a
        href="#connect"
        className="justify-self-start text-sm underline underline-offset-2"
      >
        Connect step by step, with a check that it works
      </a>
      {group && <Fields group={group} form={form} />}
      <Saving
        form={form}
        changed={form.changed || tracker !== state.company.tracker}
        usedBy={group?.usedBy ?? []}
        state={state}
      />
    </Card>
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
    <Card title={group.name} about={group.about}>
      <Fields group={group} form={form} />
      <Saving
        form={form}
        changed={form.changed}
        usedBy={group.usedBy}
        state={state}
      />
    </Card>
  );
}

// Where each part answers, to open it or tell someone.
function Addresses({ state }: Readonly<{ state: FactoryState }>) {
  const linked = state.parts.filter((part) => part.link);
  if (linked.length === 0) return null;
  return (
    <Card title="Addresses" about="Where each part answers on this computer.">
      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[12rem_1fr]">
        {linked.map((part) => (
          <div key={part.id} className="contents">
            <dt className="text-muted-foreground">{part.name}</dt>
            <dd>
              <a
                href={part.link ?? ""}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {part.link}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Card({
  title,
  about,
  children,
}: Readonly<{ title: string; about: string; children: ReactNode }>) {
  return (
    <section
      aria-label={title}
      className="grid gap-5 rounded-3xl bg-card p-6 shadow-soft"
    >
      <header className="grid gap-1">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{about}</p>
      </header>
      {children}
    </section>
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
