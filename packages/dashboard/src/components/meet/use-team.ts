// What the team does now and did last: what the frame knows (Sprocket,
// Doodle, Bolt) and what the extensions report (Tinker, Mimic, Sieve).

import { TEAM } from "@/lib/kobolds";
import { useReports } from "@/lib/meet";
import type { Now } from "@/lib/meet-view";

export type Team = { now: Now; last: Now };

export function useTeam(known: Team): Team {
  const reports = useReports();
  const now: Now = { ...known.now };
  const last: Now = { ...known.last };
  for (const member of TEAM) {
    const said = reports[member.id];
    if (said?.now) now[member.id] = said.now;
    if (said?.last) last[member.id] = said.last;
  }
  return { now, last };
}
