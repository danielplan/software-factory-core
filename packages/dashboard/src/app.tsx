import { WifiOff } from "lucide-react";

import { useFactoryState } from "@/api";
import { Dashboard } from "@/dashboard/dashboard";
import { TopBar } from "@/components/top-bar";
import { Setup } from "@/setup/setup";

// The whole page: the setup flow until there is a factory, then its
// dashboard.
export function App() {
  const { state, connected } = useFactoryState();
  return (
    <div className="flex min-h-full flex-col">
      <TopBar company={state?.mode === "factory" ? state.company.name : null} />
      {!connected && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-sm text-warning"
        >
          <WifiOff className="size-4" aria-hidden />
          The factory's window seems closed. Start it again with
          software-factory.
        </div>
      )}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {state === null && (
          <p className="text-muted-foreground">Opening the factory…</p>
        )}
        {state?.mode === "setup" && <Setup state={state} />}
        {state?.mode === "factory" && <Dashboard state={state} />}
      </main>
    </div>
  );
}
