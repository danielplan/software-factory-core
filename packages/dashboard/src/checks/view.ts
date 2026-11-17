// What the Check-up page shows, worked out from what the server sends
// (GET /api/checks): which products are being checked, the open findings
// grouped by how serious they are (most serious first), the ones already
// handled apart, and when the last check ended. Kept apart from the
// components so it is checked on its own.

import type {
  CheckView,
  ChecksView,
} from "../../../server/src/checks/checks.ts";
import type { Finding } from "../../../server/src/checks/findings.ts";

export type { CheckView, ChecksView, Finding };

export const SEVERITIES = ["high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

// A finding with the product it is in.
export type Found = Finding & { product: string; productName: string };

export type CheckupView = {
  // The checks running now.
  running: CheckView[];
  // The open findings, by how serious they are; empty groups left out.
  open: { severity: Severity; findings: Found[] }[];
  // Sent to Build or set aside.
  handled: Found[];
  // When the last check ended, if one did (ISO time).
  lastEnded: string | null;
  // A check ended (done) and found nothing still open.
  allClear: boolean;
  // Checks that could not finish, with why.
  failed: CheckView[];
};

export function checkupOf(view: ChecksView | null): CheckupView {
  const checks = view?.checks ?? [];
  const nameOf = (id: string) =>
    view?.products.find((one) => one.id === id)?.name ?? id;
  const all: Found[] = checks.flatMap((check) =>
    check.findings.map((finding) => ({
      ...finding,
      product: check.product,
      productName: nameOf(check.product),
    })),
  );
  const open = all.filter((one) => one.status === "open");
  const ended = checks
    .map((check) => check.ended)
    .filter((when): when is string => when !== null)
    .sort((a, b) => a.localeCompare(b));
  const running = checks.filter((check) => check.state === "running");
  return {
    running,
    open: SEVERITIES.map((severity) => ({
      severity,
      findings: open.filter((one) => one.severity === severity),
    })).filter((group) => group.findings.length > 0),
    handled: all.filter((one) => one.status !== "open"),
    lastEnded: ended.at(-1) ?? null,
    allClear:
      running.length === 0 &&
      open.length === 0 &&
      checks.some((check) => check.state === "done"),
    failed: checks.filter((check) => check.state === "failed"),
  };
}

// The products not being checked now, which a check can start for.
export function startable(view: ChecksView | null): string[] {
  const running = new Set(
    (view?.checks ?? [])
      .filter((check) => check.state === "running")
      .map((check) => check.product),
  );
  return (view?.products ?? [])
    .map((one) => one.id)
    .filter((id) => !running.has(id));
}
