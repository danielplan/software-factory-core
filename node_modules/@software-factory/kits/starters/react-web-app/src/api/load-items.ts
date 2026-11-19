import { clientError, refusal } from "@/api/api-error";
import { itemsSchema } from "@/api/items.schema";

// GET /api/items, checked before it is shown. Every failure is an ApiError
// with a code.
export async function loadItems({ signal }: { signal: AbortSignal }) {
  let response: Response;
  try {
    response = await fetch("/api/items", { signal, cache: "no-store" });
  } catch (error) {
    if (signal.aborted) throw error;
    throw clientError("network_unreachable", 0, error);
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw refusal(response.status, body);
  const result = itemsSchema.safeParse(body);
  if (!result.success) throw clientError("invalid_response", 200, result.error);
  return result.data.items;
}
