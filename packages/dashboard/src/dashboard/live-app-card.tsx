// Settings, The live app: where Kobble reads what happens in the app (the
// export's address, never the token), and Disconnect, which takes both out
// of the project's .env. Connecting is on the Signals page.

import { useState } from "react";

import { messageOf, post } from "@/api";
import { Button } from "@/components/ui/button";
import { useSignals } from "@/signals/use-signals";

import { Topic } from "./settings-card";

export function LiveAppCard() {
  const { data } = useSignals();
  const [problem, setProblem] = useState<string | null>(null);
  const sync = data?.sync;
  return (
    <Topic
      title="The live app"
      about="Where Kobble reads what happens in your app, every 30 minutes."
    >
      {sync?.connected ? (
        <div className="grid gap-3">
          <p className="text-sm">
            Reads from{" "}
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
            Disconnect
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not connected. Connect it on{" "}
          <a href="#signals" className="font-semibold text-blue">
            Signals
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
