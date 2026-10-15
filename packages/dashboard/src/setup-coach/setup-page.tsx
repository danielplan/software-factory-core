import { useState } from "react";

import type { State } from "@/api";
import { Accent } from "@/components/accent";
import { CreateCompany } from "@/dashboard/create-company";

import { CoachChat } from "./coach-chat";
import { DraftMap } from "./draft-map";

type SetupState = Extract<State, { mode: "setup" }>;

// Setting up by talking: the coach beside the map of the company it drafts.
// The form is still there for whoever prefers it.
export function SetupPage({ state }: Readonly<{ state: SetupState }>) {
  const [form, setForm] = useState(false);
  if (form)
    return (
      <CreateCompany
        factoriesFolder={state.factoriesFolder}
        onCoach={() => {
          setForm(false);
        }}
      />
    );
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1 pt-2">
        <h1 className="text-[30px] font-medium tracking-[-0.02em]">
          Let's set up your <Accent>factory</Accent>
        </h1>
        <button
          type="button"
          onClick={() => {
            setForm(true);
          }}
          className="min-h-11 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Fill in a form instead
        </button>
      </div>
      <div className="flex flex-wrap gap-5">
        <DraftMap
          draft={state.coach.draft}
          kits={state.kits}
          factoriesFolder={state.factoriesFolder}
          working={state.coach.working}
        />
        <CoachChat coach={state.coach} />
      </div>
    </div>
  );
}
