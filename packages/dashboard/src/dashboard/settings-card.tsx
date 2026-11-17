import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

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

import type { FactoryState } from "./dashboard";
import { fieldWords, groupWords } from "@/lib/server-words";

import { SettingInput } from "./setting-input";

// A settings group in its own card: what is set now, Save, and the parts
// that read it, to restart once saved.
export function GroupCard({
  group,
  state,
}: Readonly<{ group: GroupView; state: FactoryState }>) {
  const words = groupWords(group);
  return (
    <Topic title={words.name} about={words.about}>
      <GroupForm group={group} state={state} />
    </Topic>
  );
}

// A settings group's fields and Save, in a card of its own or an
// add-on's.
export function GroupForm({
  group,
  state,
}: Readonly<{ group: GroupView; state: FactoryState }>) {
  const form = useForm("/api/settings", (values) => ({
    group: group.id,
    values,
  }));
  return (
    <>
      <Fields group={group} form={form} />
      <Saving
        form={form}
        changed={form.changed}
        usedBy={group.usedBy}
        state={state}
      />
    </>
  );
}

// "Where work is tracked" → "settings-where-work-is-tracked".
function sectionId(name: string): string {
  return `settings-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function Topic({
  title,
  about,
  children,
}: Readonly<{ title: string; about?: string; children: ReactNode }>) {
  return (
    <Card
      id={sectionId(title)}
      aria-label={title}
      className="h-full scroll-mt-6 gap-4 py-5 shadow-soft"
    >
      <CardHeader className="gap-1 px-5">
        <CardTitle className="text-item">{title}</CardTitle>
        {about && (
          <CardDescription className="text-note">{about}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid content-start gap-4 px-5">
        {children}
      </CardContent>
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
          field={fieldWords(field)}
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
  const { t } = useTranslation("settings");
  const running = state.parts.filter(
    (part) => usedBy.includes(part.id) && part.canStop,
  );
  return (
    <>
      {form.problem && (
        <ProblemBox title={t("group.notSaved")} text={form.problem} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void form.save()} disabled={!changed}>
          {t("group.save")}
        </Button>
        {form.saved && (
          <span className="text-body text-success">
            {running.length > 0 ? t("group.savedRestart") : t("group.saved")}
          </span>
        )}
        {form.saved &&
          running.map((part) => (
            <Button
              key={part.id}
              variant="outline"
              className="h-9 px-3 text-note"
              onClick={() =>
                void post(`/api/parts/${encodeURIComponent(part.id)}/restart`)
              }
            >
              {t("group.restart", { name: part.name })}
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
