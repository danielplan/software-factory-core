// What prototype mode reads from the server, read again whenever the
// records change; and what runs in prototype mode, as it changes.

import { useEffect, useState } from "react";

import { get, onPrototypes, type PrototypePage, type VersionRun } from "@/api";
import { type Read, useRead } from "@/understand/use-records";

export const usePrototypePage = (idea: string) =>
  useRead(
    `/api/prototypes?idea=${encodeURIComponent(idea)}`,
  ) as Read<PrototypePage>;

// What runs in prototype mode: from the idea's page first, then as it
// changes.
export function useRuns(idea: string): VersionRun[] {
  const [runs, setRuns] = useState<VersionRun[]>([]);
  useEffect(() => {
    let current = true;
    get<PrototypePage>(`/api/prototypes?idea=${encodeURIComponent(idea)}`).then(
      (page) => {
        if (current) setRuns(page.versions.map((v) => v.run));
      },
      () => undefined,
    );
    const stop = onPrototypes((all) => {
      setRuns(all.filter((run) => run.idea === idea));
    });
    return () => {
      current = false;
      stop();
    };
  }, [idea]);
  return runs;
}
