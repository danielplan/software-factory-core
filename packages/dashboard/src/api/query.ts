// Reading from the server through TanStack Query: one client for the page,
// every answer checked with its zod schema (schemas/), and read again
// whenever Kobble's files change (the page's stream says so, client.ts).
// A refresh that fails shows as a problem, never as an empty page.

import { QueryClient, useQuery } from "@tanstack/react-query";
import type { z } from "zod";

import { i18n } from "@/i18n/messages";

import { get, messageOf, RequestProblem } from "./client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The page's stream says when something changed; asking again on its
      // own would only show a problem twice.
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

// The factory's state has a query of its own, kept from its stream.
export const STATE_KEY = ["/api/state"] as const;

// The answer at this path, checked with its schema.
export async function getChecked<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const checked = schema.safeParse(await get<unknown>(path));
  if (checked.success) return checked.data;
  throw new RequestProblem(i18n.t("shell.unexpected"));
}

// What reading this path asks TanStack Query, for a hook or a read outside
// one (queryClient.fetchQuery).
export const readOf = <T>(path: string, schema: z.ZodType<T>) => ({
  queryKey: [path],
  queryFn: () => getChecked(path, schema),
});

export type Read<T> = { data: T | null; problem: string | null };

// What a page shows from this path (nothing for null): the answer, or the
// problem when it could not be read; never the last answer beside a
// problem.
export function useRead<T>(path: string | null, schema: z.ZodType<T>): Read<T> {
  const query = useQuery({
    ...readOf(path ?? "", schema),
    enabled: path !== null,
  });
  if (query.error) return { data: null, problem: messageOf(query.error) };
  return { data: query.data ?? null, problem: null };
}

// Kobble's files changed: every read but the state's is read again.
export function readAgain(): void {
  void queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] !== STATE_KEY[0],
  });
}
