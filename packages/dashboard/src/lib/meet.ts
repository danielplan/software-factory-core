// "Meet the kobolds": what each kobold does now and did last, as the
// extensions report it, and the "Your kobolds" panel (open or not, and
// which kobold is lit). A tiny store the components read with
// useSyncExternalStore; the rules that turn what the page knows into lines
// are in meet-view.ts.

import { useEffect, useSyncExternalStore } from "react";

import type { TeamId } from "./kobolds.ts";

export type Report = { now: string | null; last: string | null };

type Reports = Partial<Record<TeamId, Report | undefined>>;
type Panel = { open: boolean; focus: TeamId | null; ready: number };

let reports: Reports = {};
let panel: Panel = { open: false, focus: null, ready: 0 };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// What a kobold's extension says it does (now) and did (last); null takes
// its words away (the extension is gone).
export function report(id: TeamId, said: Report | null): void {
  const was = reports[id];
  if (was?.now === said?.now && was?.last === said?.last) return;
  reports = { ...reports, [id]: said ?? undefined };
  emit();
}

// An extension's Watch component reports its kobold for as long as it is
// shown.
export function useReport(id: TeamId, said: Report | null): void {
  const now = said?.now ?? null;
  const last = said?.last ?? null;
  const has = said !== null;
  useEffect(() => {
    report(id, has ? { now, last } : null);
    return () => {
      report(id, null);
    };
  }, [id, has, now, last]);
}

export const reportsNow = (): Reports => reports;
export const panelNow = (): Panel => panel;

export function useReports(): Reports {
  return useSyncExternalStore(subscribe, reportsNow);
}

export function openTeam(focus: TeamId | null = null): void {
  panel = { ...panel, open: true, focus };
  emit();
}
export function closeTeam(): void {
  panel = { ...panel, open: false, focus: null };
  emit();
}
export function usePanel(): Panel {
  return useSyncExternalStore(subscribe, panelNow);
}

// The panel is mounted (the factory's frame): faces open it. Elsewhere (the
// setup) a face is only a face.
export function usePanelReady(): void {
  useEffect(() => {
    panel = { ...panel, ready: panel.ready + 1 };
    emit();
    return () => {
      panel = { ...panel, ready: panel.ready - 1 };
      emit();
    };
  }, []);
}
