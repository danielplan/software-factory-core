// GitHub's signals as they happen: `gh webhook forward` passes the board's
// events (issues, comments, pull requests, reviews and, for an
// organisation's board, its cards moving) to this computer without a public
// address, and each relevant one makes the factory read the board at once.
// Reading the board on a timer stays as the fallback: every minute while
// the signals are not coming, every ten minutes while they are (every minute
// still for a personal account's board, whose card moves GitHub does not
// forward).

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { Cli } from "../../../github-cli.ts";

const REPOSITORY_EVENTS = [
  "issues",
  "issue_comment",
  "pull_request",
  "pull_request_review",
  "pull_request_review_comment",
];
const PROJECT_EVENT = "projects_v2_item";
// gh prints little once connected: staying up this long counts as live.
const LIVE_AFTER_MS = 5_000;
const RETRY_MS = 15_000;
const MOST_RETRY_MS = 10 * 60_000;

export const WEBHOOK_PATH = "/api/github/webhook";

export function verifySignature(
  secret: string,
  body: string,
  header: string | undefined,
): boolean {
  if (!header) return false;
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
  );
  const received = Buffer.from(header);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

type Payload = { repository?: { full_name?: string } };

// Whether a signal is about this board's repository (or its organisation's
// cards).
export function isRelevant(
  event: string,
  payload: unknown,
  repository: string,
): boolean {
  if (event === PROJECT_EVENT) return true;
  if (!REPOSITORY_EVENTS.includes(event)) return false;
  return (
    (payload as Payload | null)?.repository?.full_name?.toLowerCase() ===
    repository.toLowerCase()
  );
}

export type SignalsView = {
  live: boolean;
  // Card moves come as signals too (an organisation's board).
  moves: boolean;
  problem: string | null;
};

export type SignalsOptions = {
  cli: Cli;
  repository: string;
  // Where gh sends the signals.
  url: string;
  onLive: (moves: boolean) => void;
  onLost: () => void;
  retryMs?: number;
  liveAfterMs?: number;
};

export class Signals {
  readonly secret = randomBytes(24).toString("hex");
  private readonly options: SignalsOptions;
  private stopped = false;
  private live = false;
  private moves = false;
  private problem: string | null = null;
  private failures = 0;
  private stopRunning: (() => void) | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: SignalsOptions) {
    this.options = options;
  }

  view(): SignalsView {
    return { live: this.live, moves: this.moves, problem: this.problem };
  }

  async start(): Promise<void> {
    if (this.stopped) return;
    const { cli, repository, url } = this.options;
    const owner = repository.split("/")[0] ?? "";
    this.moves = await isOrganisation(cli, owner);
    if (this.isStopped()) return;
    const events = this.moves
      ? [...REPOSITORY_EVENTS, PROJECT_EVENT]
      : REPOSITORY_EVENTS;
    let said = "";
    const running = cli.start(
      [
        "webhook",
        "forward",
        this.moves ? `--org=${owner}` : `--repo=${repository}`,
        `--events=${events.join(",")}`,
        `--url=${url}`,
        `--secret=${this.secret}`,
      ],
      (line) => {
        if (line.trim()) said = line.trim();
      },
    );
    this.stopRunning = running.stop ?? null;
    const live = setTimeout(() => {
      this.live = true;
      this.problem = null;
      this.failures = 0;
      this.options.onLive(this.moves);
    }, this.options.liveAfterMs ?? LIVE_AFTER_MS);
    live.unref();
    const code = await running.done;
    clearTimeout(live);
    this.lost(said || `gh stopped (${String(code)})`);
  }

  private lost(reason: string): void {
    const wasLive = this.live;
    this.live = false;
    this.stopRunning = null;
    if (this.stopped) return;
    this.problem = `GitHub's signals stopped (${reason}); the board is read every minute meanwhile.`;
    if (wasLive) this.options.onLost();
    this.failures++;
    const wait = Math.min(
      (this.options.retryMs ?? RETRY_MS) * 2 ** (this.failures - 1),
      MOST_RETRY_MS,
    );
    this.timer = setTimeout(() => {
      void this.start();
    }, wait);
    this.timer.unref();
  }

  private isStopped(): boolean {
    return this.stopped;
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.stopRunning?.();
  }
}

async function isOrganisation(cli: Cli, owner: string): Promise<boolean> {
  try {
    const ran = await cli.run(["api", `users/${owner}`, "--jq", ".type"]);
    return ran.code === 0 && ran.out.trim() === "Organization";
  } catch {
    return false;
  }
}
