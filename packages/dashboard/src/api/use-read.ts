// What a page shows, read from the server and read again whenever Kobble's
// files change (the page's stream says so).

import { useEffect, useState } from "react";

import { get, messageOf, onKobbleChanged } from "@/api/client";

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
    const stop = onKobbleChanged(load);
    return () => {
      current = false;
      stop();
    };
  }, [path]);
  // What was read for another page is not shown while this one loads.
  return read.path === path ? read : { data: null, problem: null };
}
