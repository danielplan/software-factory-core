import { WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useFactoryState } from "@/api";
import { Splash } from "@/components/splash";
import { Dashboard } from "@/dashboard/dashboard";

// The whole page: the dashboard (it asks for the company first when there
// is none), and a line at the top while the factory's window is closed. On
// opening, a sky of clouds with the kobold running, which part once the
// factory has answered (only then, not on a change of language).
export function App() {
  const { state, connected } = useFactoryState();
  // A new language draws every page again in it.
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  const [opening, setOpening] = useState(true);
  const opened = useCallback(() => {
    setOpening(false);
  }, []);
  return (
    <>
      {opening && <Splash ready={state !== null} onDone={opened} />}
      <div key={i18n.language} className="min-h-dvh bg-ground">
        {!connected && (
          <div
            role="alert"
            className="fixed inset-x-0 top-3 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-body text-muted-foreground shadow-[0_0_0_1px_var(--border),var(--shadow-big)]"
          >
            <WifiOff className="size-4 flex-none" aria-hidden />
            {i18n.t("app.closed")}
          </div>
        )}
        {state === null && (
          <p className="pt-[30vh] text-center text-muted-foreground">
            {i18n.t("app.opening")}
          </p>
        )}
        {state && <Dashboard state={state} />}
      </div>
    </>
  );
}
