import { WifiOff } from "lucide-react";

import { useFactoryState } from "@/api";
import { Dashboard } from "@/dashboard/dashboard";

// The whole page: the dashboard (it asks for the company first when there
// is none), and a line at the top while the factory's window is closed.
export function App() {
  const { state, connected } = useFactoryState();
  return (
    <div className="min-h-dvh bg-ground">
      {!connected && (
        <div
          role="alert"
          className="fixed inset-x-0 top-3 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-[0_0_0_1px_var(--border),var(--shadow-big)]"
        >
          <WifiOff className="size-4 flex-none" aria-hidden />
          The factory's window seems closed. Start it again with
          software-factory.
        </div>
      )}
      {state === null && (
        <p className="pt-[30vh] text-center text-muted-foreground">
          Opening the factory…
        </p>
      )}
      {state && <Dashboard state={state} />}
    </div>
  );
}
