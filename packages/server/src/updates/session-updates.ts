// Updates for the session's project: after an update, the products that
// run start again, so the new version is what the owner sees.

import type { Session } from "../session.ts";
import { servedUpdates } from "./served.ts";

export function updatesOf(session: Session, onChange: () => void) {
  return servedUpdates({
    project: session.options.project,
    onChange,
    restartRunning: async () => {
      let launcher;
      try {
        launcher = session.launcherOrRefuse();
      } catch {
        return;
      }
      for (const part of launcher.state())
        if (part.area === "products" && part.light === "running")
          await launcher.restart(part.id);
    },
  });
}
