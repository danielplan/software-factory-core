// Sync now, beside the line about the last sync: reads the live app at
// once and says what came.

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { messageOf, post } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

export function SyncNow({
  onSaid,
}: Readonly<{ onSaid: (said: string) => void }>) {
  const [busy, setBusy] = useState(false);
  const t = useT().signals;
  return (
    <Button
      variant="ring"
      size="pill"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        post<{ added: number }>("/api/kobble/sync")
          .then(
            ({ added }) => {
              onSaid(added === 0 ? t.syncedNothing : t.syncedNew(added));
            },
            (error: unknown) => {
              onSaid(messageOf(error));
            },
          )
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      <RefreshCw
        aria-hidden
        strokeWidth={2}
        className={cn("size-[15px]", busy && "animate-spin")}
      />
      {t.syncNow}
    </Button>
  );
}
