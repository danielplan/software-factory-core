// The support kobold's conversation, read again whenever it changes; and
// where it takes the person, followed once per move.

import { useEffect, useRef } from "react";

import { useRead } from "@/api/query";
import { type SupportView, supportViewSchema } from "@/api/schemas/support";

export function useSupport(): SupportView | null {
  return useRead("/api/kobble/support", supportViewSchema).data;
}

// Moves the page where Sprocket takes the person (#explore/X-3): each new
// move once, never one from before the page was opened.
export function useSprocketMoves(): void {
  const support = useSupport();
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!support) return;
    const n = support.went?.n ?? 0;
    if (seen.current === null || n <= seen.current) {
      seen.current = Math.max(seen.current ?? 0, n);
      return;
    }
    seen.current = n;
    if (support.went) window.location.hash = support.went.to;
  }, [support]);
}
