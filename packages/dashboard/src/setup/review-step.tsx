import { CircleCheck, CircleX, LoaderCircle, Clock } from "lucide-react";
import { useState } from "react";

import { type Job, type KitView, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";

import { type Draft, factoryFolder, TRACKER_NAMES } from "./draft";
import { StepFrame } from "./step-frame";
import { trackerSettings } from "./tracker-step";

// What will be set up, then setting it up: the factory's folder is written,
// new products are made with their starters (the jobs show how far), and the
// page turns into the dashboard once it is done.
export function ReviewStep({
  draft,
  factoriesFolder,
  kits,
  jobs,
  onBack,
}: Readonly<{
  draft: Draft;
  factoriesFolder: string;
  kits: KitView[];
  jobs: Job[];
  onBack: () => void;
}>) {
  const folder = factoryFolder(draft, factoriesFolder);
  const { working, problem, finish } = useFinish(draft, folder);
  return (
    <StepFrame
      step={3}
      title="Ready to set up"
      about="Check what the factory will do. Products marked new are made now with their framework's starter; that can take a few minutes."
      onBack={onBack}
      {...(working ? {} : { onNext: () => void finish() })}
      nextLabel="Set up the factory"
    >
      <Summary draft={draft} folder={folder} kits={kits} />
      {problem && (
        <ProblemBox title="The factory could not be set up" text={problem} />
      )}
      {working && jobs.length > 0 && <JobList jobs={jobs} />}
      {working && jobs.length === 0 && !problem && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden /> Setting
          up…
        </p>
      )}
    </StepFrame>
  );
}

// Setting the factory up; the server switches the page to the dashboard
// once it is done, so only a problem comes back here.
function useFinish(draft: Draft, folder: string) {
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const finish = async () => {
    setWorking(true);
    setProblem(null);
    try {
      await post("/api/setup/finish", {
        company: {
          name: draft.name.trim(),
          about: draft.about.trim(),
          tracker: draft.tracker,
        },
        folder,
        products: draft.products,
        settings: trackerSettings(draft),
      });
    } catch (error) {
      setProblem(messageOf(error));
      setWorking(false);
    }
  };
  return { working, problem, finish };
}

function Summary({
  draft,
  folder,
  kits,
}: Readonly<{ draft: Draft; folder: string; kits: KitView[] }>) {
  const kitName = (kind: string) =>
    kits.find((k) => k.kind === kind)?.name ?? kind;
  return (
    <dl className="grid max-w-2xl gap-3 rounded-xl border bg-card p-4 text-sm sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted-foreground">Company</dt>
      <dd>
        <span className="font-medium">{draft.name}</span>
        {draft.about && (
          <span className="text-muted-foreground"> · {draft.about}</span>
        )}
      </dd>
      <dt className="text-muted-foreground">Factory folder</dt>
      <dd className="break-all">{folder}</dd>
      <dt className="text-muted-foreground">Products</dt>
      <dd>
        <ul className="grid gap-1">
          {draft.products.map((p) => (
            <li key={p.id}>
              <span className="font-medium">{p.name}</span> · {kitName(p.kind)}
              {p.isNew ? " · new" : ""}
              <div className="break-all text-xs text-muted-foreground">
                {p.folder}
              </div>
            </li>
          ))}
        </ul>
      </dd>
      <dt className="text-muted-foreground">Work tracked in</dt>
      <dd>{TRACKER_NAMES[draft.tracker]}</dd>
    </dl>
  );
}

const JOB_ICON = {
  waiting: <Clock className="size-4 text-muted-foreground" aria-hidden />,
  working: (
    <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden />
  ),
  done: <CircleCheck className="size-4 text-success" aria-hidden />,
  failed: <CircleX className="size-4 text-destructive" aria-hidden />,
};

function JobList({ jobs }: Readonly<{ jobs: Job[] }>) {
  return (
    <ul className="grid gap-2" aria-label="Making the products">
      {jobs.map((job) => (
        <li key={job.id} className="grid gap-1 rounded-xl border bg-card p-3">
          <span className="flex items-center gap-2 font-medium">
            {JOB_ICON[job.state]} {job.label}
          </span>
          {job.log.length > 0 && (
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
              {job.log.join("\n")}
            </pre>
          )}
        </li>
      ))}
    </ul>
  );
}
