// The factory's state, kept up to date from its stream of changes
// (/api/events, the browser's EventSource): each message is the whole
// state, checked with its schema and put in TanStack Query's cache; a
// "kobble-changed" event reads every page's answer again (query.ts).

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { messageOf, RequestProblem } from "./client";
import { getChecked, queryClient, readAgain, STATE_KEY } from "./query";
import { type State, stateSchema } from "./schemas/state";

const readState = () => getChecked("/api/state", stateSchema);

// A state the stream sent, when it reads as one; else the state is read
// again, so a problem shows.
function took(data: string): void {
  const checked = stateSchema.safeParse(JSON.parse(data));
  if (checked.success) queryClient.setQueryData(STATE_KEY, checked.data);
  else void queryClient.invalidateQueries({ queryKey: STATE_KEY });
}

// The factory's state: null until the first answer; `connected` false while
// the server is away; `problem` when its answer could not be read.
export function useFactoryState(): {
  state: State | null;
  connected: boolean;
  problem: string | null;
} {
  const query = useQuery({ queryKey: STATE_KEY, queryFn: readState });
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    // EventSource tries again by itself when the connection drops.
    const events = new EventSource("/api/events");
    events.onmessage = (event: MessageEvent<string>) => {
      took(event.data);
      setConnected(true);
    };
    events.onopen = () => {
      setConnected(true);
      void queryClient.invalidateQueries({ queryKey: STATE_KEY });
      readAgain();
    };
    events.addEventListener("kobble-changed", readAgain);
    events.onerror = () => {
      setConnected(false);
    };
    return () => {
      events.close();
    };
  }, []);
  // The server not answering at all is the window being closed; an answer
  // it gave that cannot be read is a problem.
  const { error } = query;
  const answered = error instanceof RequestProblem;
  return {
    state: query.data ?? null,
    connected: connected && (error === null || answered),
    problem: answered && !query.data ? messageOf(error) : null,
  };
}
