// Settings, The live app: where Kobble reads what happens in the app (the
// export's address, never the token), and Disconnect, which takes both out
// of the project's .env. Connecting is on the Signals page.

import { useState } from "react";

import { messageOf, post } from "@/api";
import { Button } from "@/components/ui/button";
import { useSignals } from "@/signals/use-signals";

import { useT } from "@/i18n/use-t";

import { Topic } from "./settings-card";

export function LiveAppCard() {
  const { data } = useSignals();
  const [problem, setProblem] = useState<string | null>(null);
  const t = useT();
  const sync = data?.sync;
  return (
    <Topic title={t.settings.sections.liveApp} about={t.settings.liveApp.about}>
      {sync?.connected ? (
        <div className="grid gap-3">
          <p className="text-[13px]">
            {t.settings.liveApp.readsFrom}{" "}
            <span className="font-medium break-all">{sync.address}</span>
          </p>
          <Button
            variant="ring"
            size="pill-sm"
            className="w-fit"
            onClick={() => {
              setProblem(null);
              post("/api/kobble/disconnect").catch((error: unknown) => {
                setProblem(messageOf(error));
              });
            }}
          >
            {t.settings.liveApp.disconnect}
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {t.settings.liveApp.notConnected}{" "}
          <a href="#signals" className="font-semibold text-blue">
            {t.shell.pages.signals}
          </a>
          .
        </p>
      )}
      {problem && (
        <p role="alert" className="text-[13px] text-destructive">
          {problem}
        </p>
      )}
    </Topic>
  );
}
