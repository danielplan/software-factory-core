import { CircleCheck, CircleX, Clock, LoaderCircle } from "lucide-react";

import type { Job } from "@/api";

// Work that takes a while (making a new product), with how far it is.
const JOB_ICON = {
  waiting: <Clock className="size-4 text-muted-foreground" aria-hidden />,
  working: (
    <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden />
  ),
  done: <CircleCheck className="size-4 text-success" aria-hidden />,
  failed: <CircleX className="size-4 text-destructive" aria-hidden />,
};

export function JobList({ jobs }: Readonly<{ jobs: Job[] }>) {
  return (
    <ul className="grid gap-2" aria-label="Making the products">
      {jobs.map((job) => (
        <li
          key={job.id}
          className="grid gap-1 rounded-[14px] border border-border-soft bg-card p-3"
        >
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
