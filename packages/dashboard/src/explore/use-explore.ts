// What Explore and prototype mode read from the server, read again whenever
// the records change; and what runs in prototype mode, as it changes.

import { useEffect, useState } from "react";

import {
  type ExploreList,
  get,
  type IdeaPage,
  onPrototypes,
  type PrototypePage,
  type VersionRun,
} from "@/api";
import { type Read, useRead } from "@/understand/use-records";

export const useExploreList = () =>
  useRead("/api/explore") as Read<ExploreList>;

export const useIdeaPage = (id: string) =>
  useRead(`/api/explore/idea?id=${encodeURIComponent(id)}`) as Read<IdeaPage>;

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
