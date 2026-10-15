import { useState } from "react";

import { messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import {
  type Tracker,
  TrackerFields,
  trackerValues,
} from "@/setup/tracker-fields";

import type { FactoryState } from "./dashboard";

// Where the company's work is tracked: not yet, a GitHub board or Jira
// Cloud, with the chosen one's settings. Nothing is saved when the server
// refuses a value; it says why.
export function TrackerPanel({ state }: Readonly<{ state: FactoryState }>) {
  const [tracker, setTracker] = useState<Tracker>(state.company.tracker);
  const [values, setValues] = useState<Record<string, string>>({});
  const [refused, setRefused] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setProblem(null);
    setSaved(false);
    try {
      const answer = await post<{ refused: Record<string, string> }>(
        "/api/company/tracker",
        { tracker, settings: trackerValues(tracker, values) },
      );
      setRefused(answer.refused);
      setSaved(Object.keys(answer.refused).length === 0);
    } catch (error) {
      setProblem(messageOf(error));
    }
  };
  const reasons = Object.entries(refused).map(([key, why]) => `${key}: ${why}`);
  return (
    <section
      aria-label="Where work is tracked"
      className="grid gap-5 rounded-3xl bg-card p-6"
    >
      <header className="grid gap-1">
        <h2 className="font-semibold">Where work is tracked</h2>
        <p className="text-sm text-muted-foreground">
          Where the ideas you agree with the factory become work to build. The
          factory does not work on the board yet: this is saved for the runner,
          which comes next.
        </p>
      </header>
      <TrackerFields
        tracker={tracker}
        values={values}
        onTracker={(next) => {
          setTracker(next);
          setSaved(false);
        }}
        onValues={setValues}
      />
      {reasons.length > 0 && (
        <ProblemBox title="Not saved" text={reasons.join(" · ")} />
      )}
      {problem && <ProblemBox title="Not saved" text={problem} />}
      <div className="flex items-center gap-3">
        <Button className="h-10" onClick={() => void save()}>
          Save
        </Button>
        {saved && <span className="text-sm text-success">Saved.</span>}
      </div>
    </section>
  );
}
