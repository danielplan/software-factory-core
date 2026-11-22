import { WifiOff } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { HashRouter } from "react-router";

import { useFactoryState } from "@/api/live";
import { Dashboard } from "./router";

import { setBrand } from "@/lib/brand";

// The whole page: the dashboard (it asks for the company first when there
// is none), and a line at the top while the factory's window is closed.
export function App() {
  const { state, connected, problem } = useFactoryState();
  const t = useTranslation().t;
  const company = state?.mode === "factory" ? state.company : null;
  useEffect(() => {
    setBrand(company?.name ?? null, company?.brand);
  }, [company?.name, company?.brand]);
  return (
    <div className="min-h-dvh bg-ground">
      {!connected && (
        <div
          role="alert"
          className="fixed inset-x-0 top-3 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-[13px] text-muted-foreground shadow-[0_0_0_1px_var(--border),var(--shadow-big)]"
        >
          <WifiOff className="size-4 flex-none" aria-hidden />
          {t("shell.closed")}
        </div>
      )}
      {state === null && (
        <p
          role={problem ? "alert" : undefined}
          className="pt-[30vh] text-center text-muted-foreground"
        >
          {problem ?? t("shell.opening")}
        </p>
      )}
      {state && (
        // The address after the #, as it always was; a page shows at once,
        // without React's transitions keeping the last one on screen.
        <HashRouter useTransitions={false}>
          <Dashboard state={state} />
        </HashRouter>
      )}
    </div>
  );
}
