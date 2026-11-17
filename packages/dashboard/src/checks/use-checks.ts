// What the Check-up page reads from the server (GET /api/checks), read
// again whenever the kobold's jobs change (a check runs, finds something,
// ends) or the records do (a finding sent to Build).

import { useCallback, useEffect, useState } from "react";

import { get, messageOf, onKobold, onRecordsChanged } from "@/api";

import type { ChecksView } from "./view";

export function useChecks(): {
  data: ChecksView | null;
  problem: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<ChecksView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const reload = useCallback(() => {
    get<ChecksView>("/api/checks").then(
      (read) => {
        setData(read);
        setProblem(null);
      },
      (error: unknown) => {
        setProblem(messageOf(error));
      },
    );
  }, []);
  useEffect(() => {
    reload();
    const stopKobold = onKobold(reload);
    const stopRecords = onRecordsChanged(reload);
    return () => {
      stopKobold();
      stopRecords();
    };
  }, [reload]);
  return { data, problem, reload };
}
