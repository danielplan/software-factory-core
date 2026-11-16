// The records a page shows, read from the server and read again whenever
// they change (the page's stream says so); and the kobold's jobs, as they
// work.

import { useEffect, useState } from "react";

import {
  get,
  type KoboldJob,
  messageOf,
  onKobold,
  onRecordsChanged,
  type PersonaPage,
  type RecordsView,
  type SignalView,
  type StoryPage,
  type UnderstandOverview,
} from "@/api";

export type Read<T> = { data: T | null; problem: string | null };

// The records at this path; typed by the hooks below.
export function useRead(path: string): Read<unknown> {
  const [read, setRead] = useState<Read<unknown> & { path: string }>({
    path,
    data: null,
    problem: null,
  });
  useEffect(() => {
    let current = true;
    const load = () => {
      get<unknown>(path).then(
        (data) => {
          if (current) setRead({ path, data, problem: null });
        },
        (error: unknown) => {
          if (current) setRead({ path, data: null, problem: messageOf(error) });
        },
      );
    };
    load();
    const stop = onRecordsChanged(load);
    return () => {
      current = false;
      stop();
    };
  }, [path]);
  // What was read for another page is not shown while this one loads.
  return read.path === path ? read : { data: null, problem: null };
}

const asked = (path: string, id: string) =>
  `${path}?id=${encodeURIComponent(id)}`;

export const useOverview = () =>
  useRead("/api/understand") as Read<UnderstandOverview>;
export const usePersona = (id: string) =>
  useRead(asked("/api/understand/persona", id)) as Read<PersonaPage>;
export const useStory = (id: string) =>
  useRead(asked("/api/understand/story", id)) as Read<StoryPage>;
export const useSignal = (id: string) =>
  useRead(asked("/api/understand/signal", id)) as Read<SignalView>;
export const useAllRecords = () => useRead("/api/records") as Read<RecordsView>;

export function useKoboldJobs(): KoboldJob[] {
  const [jobs, setJobs] = useState<KoboldJob[]>([]);
  useEffect(() => {
    let current = true;
    get<{ jobs: KoboldJob[] }>("/api/understand/kobold").then(
      (answer) => {
        if (current) setJobs(answer.jobs);
      },
      () => undefined,
    );
    const stop = onKobold(setJobs);
    return () => {
      current = false;
      stop();
    };
  }, []);
  return jobs;
}
