import type { z } from 'zod';
import { clientError, refusal } from './api-error';
import { apiUrl } from './api-url';

const timeoutMs = 15_000;

type Options = {
  method?: 'GET' | 'PUT' | 'POST';
  /** Sent as JSON. */
  body?: unknown;
  signal?: AbortSignal;
};

// React Native's AbortSignal has no timeout() or any() yet, so the request
// gets its own controller that stops after the time limit or when the caller
// (TanStack Query) cancels.
async function send(path: string, options: Options) {
  const controller = new AbortController();
  const stop = () => {
    controller.abort();
  };
  const timer = setTimeout(stop, timeoutMs);
  options.signal?.addEventListener('abort', stop);
  try {
    return await fetch(`${apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers:
        options.body === undefined
          ? {}
          : { 'content-type': 'application/json' },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    // A change whose answer never came may still have been saved.
    throw clientError(
      options.method && options.method !== 'GET'
        ? 'action_unconfirmed'
        : 'network_unreachable',
      0,
      error,
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', stop);
  }
}

/**
 * One request to the backend, checked with `schema`. Every failure is an
 * ApiError: the backend's refusal, no answer, or an answer of the wrong shape.
 */
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: Options = {},
): Promise<T> {
  const response = await send(path, options);
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw clientError(
      response.ok ? 'invalid_response' : 'service_unavailable',
      response.status,
      error,
    );
  }
  if (!response.ok) throw refusal(response.status, body);
  const checked = schema.safeParse(body);
  if (!checked.success)
    throw clientError('invalid_response', response.status, checked.error);
  return checked.data;
}
