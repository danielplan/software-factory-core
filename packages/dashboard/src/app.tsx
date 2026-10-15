import { WifiOff } from "lucide-react";

import { useFactoryState } from "@/api";
import { Dashboard } from "@/dashboard/dashboard";

// The whole page: the dashboard, on the grey ground (it asks for the
// company first when there is none).
export function App() {
  const { state, connected } = useFactoryState();
  return (
    <div className="min-h-full px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        {!connected && (
          <div
            role="alert"
            className="flex items-center justify-center gap-2 rounded-2xl bg-card px-4 py-2.5 text-sm text-muted-foreground"
          >
            <WifiOff className="size-4" aria-hidden />
            The factory's window seems closed. Start it again with
            software-factory.
          </div>
        )}
        {state === null && (
          <p className="text-center text-muted-foreground">
            Opening the factory…
          </p>
        )}
        {state && <Dashboard state={state} />}
      </div>
    </div>
  );
}
