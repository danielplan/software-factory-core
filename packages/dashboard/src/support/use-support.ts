// The support kobold's conversation, read again whenever it changes.

import { useRead } from "@/lib/use-read";

export type SupportView = {
  messages: { from: "kobold" | "you"; text: string }[];
  writing: string | null;
  activity: string | null;
  problem: string | null;
};

export function useSupport(): SupportView | null {
  return useRead("/api/kobble/support").data as SupportView | null;
}
