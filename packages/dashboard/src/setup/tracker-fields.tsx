import { Ban, GitBranch, SquareKanban } from "lucide-react";
import type { ReactNode } from "react";

import type { Company } from "@/api";
import { ChoiceCard } from "@/components/choice-card";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";

import { TRACKER_NAMES } from "./draft";

export type Tracker = Company["tracker"];

// The fields of each tracker, as the server saves them
// (packages/server/src/trackers.ts).
const FIELDS: Record<
  Tracker,
  { key: string; label: string; help: string; secret?: true }[]
> = {
  none: [],
  github: [
    {
      key: "GITHUB_REPOSITORY",
      label: "Repository",
      help: "As owner/name, for example acme/shop.",
    },
    {
      key: "GITHUB_PROJECT",
      label: "Board number",
      help: "The number at the end of the board's address (…/projects/1).",
    },
  ],
  jira: [
    {
      key: "JIRA_SITE",
      label: "Site",
      help: "Your Jira's address, for example acme.atlassian.net.",
    },
    {
      key: "JIRA_PROJECT",
      label: "Project key",
      help: "The letters before an issue's number (ACME in ACME-12).",
    },
    {
      key: "JIRA_EMAIL",
      label: "Your email",
      help: "The email you sign in to Jira with.",
    },
    {
      key: "JIRA_TOKEN",
      label: "API token",
      help: "Made at id.atlassian.com, Security, API tokens. Kept only on this computer.",
      secret: true,
    },
  ],
};

const ICONS: Record<Tracker, ReactNode> = {
  none: <Ban aria-hidden />,
  github: <GitBranch aria-hidden />,
  jira: <SquareKanban aria-hidden />,
};

const ABOUT: Record<Tracker, string> = {
  none: "Just the factory for now. You can choose later.",
  github: "Ideas become cards on a GitHub board.",
  jira: "Ideas become issues in a Jira Cloud project.",
};

// The three choices, and the chosen tracker's fields.
export function TrackerFields({
  tracker,
  values,
  onTracker,
  onValues,
}: Readonly<{
  tracker: Tracker;
  values: Record<string, string>;
  onTracker: (tracker: Tracker) => void;
  onValues: (values: Record<string, string>) => void;
}>) {
  return (
    <div className="grid gap-5">
      <div
        className="grid gap-4 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Tracker"
      >
        {(Object.keys(TRACKER_NAMES) as Tracker[]).map((one) => (
          <ChoiceCard
            key={one}
            chosen={tracker === one}
            icon={ICONS[one]}
            title={TRACKER_NAMES[one]}
            text={ABOUT[one]}
            onChoose={() => {
              onTracker(one);
            }}
          />
        ))}
      </div>
      {FIELDS[tracker].length > 0 && (
        <div className="grid max-w-xl gap-4">
          {FIELDS[tracker].map((field) => (
            <Field
              key={field.key}
              label={field.label}
              id={field.key}
              help={field.help}
            >
              <Input
                id={field.key}
                type={field.secret ? "password" : "text"}
                autoComplete="off"
                value={values[field.key] ?? ""}
                onChange={(event) => {
                  onValues({ ...values, [field.key]: event.target.value });
                }}
              />
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}

// Only the chosen tracker's values, and none left empty.
export function trackerValues(
  tracker: Tracker,
  values: Record<string, string>,
): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const field of FIELDS[tracker]) {
    const value = values[field.key]?.trim() ?? "";
    if (value !== "") kept[field.key] = value;
  }
  return kept;
}
