import { Ban, GitBranch, SquareKanban } from "lucide-react";
import type { ReactNode } from "react";

import type { Company } from "@/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { Field } from "./company-step";
import { type Draft, TRACKER_NAMES } from "./draft";
import { StepFrame } from "./step-frame";

type Tracker = Company["tracker"];

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
  none: "Just the factory for now. You can choose later in Settings.",
  github: "Ideas become cards on a GitHub board.",
  jira: "Ideas become issues in a Jira Cloud project.",
};

export function TrackerStep({
  draft,
  onChange,
  onBack,
  onNext,
}: Readonly<{
  draft: Draft;
  onChange: (change: Partial<Draft>) => void;
  onBack: () => void;
  onNext: () => void;
}>) {
  return (
    <StepFrame
      step={2}
      title="Where is your work tracked?"
      about="Where the ideas you agree with the factory become work to build. The factory does not work on the board yet: this is saved for the runner, which comes next."
      onBack={onBack}
      onNext={onNext}
    >
      <div
        className="grid gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Tracker"
      >
        {(Object.keys(TRACKER_NAMES) as Tracker[]).map((tracker) => (
          <button
            key={tracker}
            type="button"
            role="radio"
            aria-checked={draft.tracker === tracker}
            onClick={() => {
              onChange({ tracker });
            }}
            className={cn(
              "grid gap-2 rounded-xl border bg-card p-4 text-left transition hover:border-primary [&_svg]:size-5",
              draft.tracker === tracker && "border-primary bg-secondary",
            )}
          >
            {ICONS[tracker]}
            <span className="font-semibold">{TRACKER_NAMES[tracker]}</span>
            <span className="text-sm text-muted-foreground">
              {ABOUT[tracker]}
            </span>
          </button>
        ))}
      </div>
      {FIELDS[draft.tracker].length > 0 && (
        <div className="grid max-w-xl gap-4">
          {FIELDS[draft.tracker].map((field) => (
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
                value={draft.settings[field.key] ?? ""}
                onChange={(event) => {
                  onChange({
                    settings: {
                      ...draft.settings,
                      [field.key]: event.target.value,
                    },
                  });
                }}
              />
            </Field>
          ))}
        </div>
      )}
    </StepFrame>
  );
}

// Only the chosen tracker's values, and none left empty.
export function trackerSettings(draft: Draft): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of FIELDS[draft.tracker]) {
    const value = draft.settings[field.key]?.trim() ?? "";
    if (value !== "") values[field.key] = value;
  }
  return values;
}
