// The connected board's work, put together: its cards, the builder and the
// coach in the cards (the builder on from the start, the coach off until
// the owner switches it on), with their
// working copies in a folder next to the project. None without a connected
// board. Which issues Kobble waits for "did it work?" about comes from the
// records, once the server serves them.

import type { Browser } from "../../../kobble/browser.ts";
import { basename, dirname, join } from "node:path";

import {
  type Available,
  builderModel,
  type Claude,
  parallelCards,
  Workspace,
} from "@software-factory/core";

import type { Cli } from "../../../github-cli.ts";
import { Refused } from "../../../refused.ts";
import { cardsFor, type TaskBoards } from "../../../cards/cards-for.ts";
import { readBoard } from "../../../connect/board-file.ts";
import { homeOf } from "../../../prototypes/copies.ts";
import { BoardWork, EVERY_MS } from "./board-work.ts";
import { copyName, Jobs } from "./jobs.ts";
import {
  type CodeHost,
  codeHostFor,
  type CodeHosts,
} from "../../../code-host.ts";
import {
  isRelevant,
  Signals,
  verifySignature,
  WEBHOOK_PATH,
} from "./signals.ts";

// Reading the board while GitHub's signals come as they happen.
const WITH_SIGNALS_MS = 10 * 60_000;

export type WorkSettings = {
  // The factory's folder and the project around it.
  root: string;
  project: string;
  cli: Cli;
  claude: Claude;
  available: Available;
  onChange: () => void;
  waiting?: () => ReadonlySet<number>;
  browser?: () => Promise<Browser>;
  // The code hosts, by the extension that fills the `code` slot with one,
  // and the trackers' cards, by the one that fills the `tasks` slot.
  codeHosts: CodeHosts;
  boards: TaskBoards;
};

export function workFor(
  settings: WorkSettings,
):
  | { work: BoardWork; repository: string; codeHost: CodeHost }
  | { problem: string }
  | null {
  const { root, project, claude, available, onChange, waiting, browser } =
    settings;
  const found = cardsFor(root, settings.boards);
  if ("problem" in found) return null;
  const copies = join(dirname(project), `${basename(project)}-factory-copies`);
  const codeHost = codeHostFor(
    root,
    available.extensions,
    settings.codeHosts,
    found.repository,
  );
  if ("problem" in codeHost) return codeHost;
  const pullRequests = codeHost;
  const copyOf = async (name: string) =>
    new Workspace(
      {
        source: project,
        workspaces: copies,
        // The prototype copies are the factory's too: a card's branch is
        // freed from them; anywhere else it is a person's.
        ownCopies: [homeOf(project)],
        baseBranch: await pullRequests.baseBranch(),
      },
      name,
    );
  const jobs = new Jobs({
    cards: found.cards,
    codeHost,
    claude,
    available,
    copies: {
      chat: (place) => copyOf(copyName("chat", place)),
      build: (place) => copyOf(copyName("build", place)),
    },
    model: () => builderModel(root),
    ...(browser ? { browser } : {}),
  });
  const work = new BoardWork({
    cards: found.cards,
    pullRequests,
    jobs,
    onChange,
    places: () => parallelCards(root),
    // The builder works as soon as the factory starts.
    building: true,
    ...(waiting ? { waiting } : {}),
  });
  return { work, repository: found.repository, codeHost };
}

// The Factory's board work: connected once a factory with a board opens,
// connected again when the board changes, stopped when the factory closes.
export class ConnectedWork {
  private readonly settings: Omit<WorkSettings, "root">;
  private work: BoardWork | null = null;
  private repository = "";
  private codeHost: CodeHost | null = null;
  // Why the builder cannot work the connected board (no code host to push
  // to); none when it can, or when no board is connected.
  private problem: string | null = null;
  private signals: Signals | null = null;
  // The factory's own address, once it listens: where gh sends signals.
  private base: string | null = null;
  // The board it was connected to, to see when it changes.
  private board = "";
  // The issues Kobble waits for "did it work?" about, once the records are
  // served (the board may connect before).
  private waiting: () => ReadonlySet<number> = () => new Set();

  constructor(settings: Omit<WorkSettings, "root" | "waiting">) {
    this.settings = { ...settings, waiting: () => this.waiting() };
  }

  view() {
    const view = this.work?.view() ?? null;
    return view && this.signals
      ? { ...view, signals: this.signals.view() }
      : view;
  }

  // The factory listens at this address: GitHub's signals can come.
  listenAt(base: string): void {
    this.base = base;
    this.startSignals();
  }

  // A signal from gh webhook forward: checked, and the board read at once
  // when it is about this board. False when it is not GitHub's.
  signal(event: string, body: string, signature: string | undefined): boolean {
    if (!this.signals || !verifySignature(this.signals.secret, body, signature))
      return false;
    if (isRelevant(event, jsonOf(body), this.repository)) this.refresh();
    return true;
  }

  private startSignals(): void {
    if (!this.work || !this.base || this.signals) return;
    const work = this.work;
    this.signals = new Signals({
      cli: this.settings.cli,
      repository: this.repository,
      url: `${this.base}${WEBHOOK_PATH.replace(/^\/api/, "")}`,
      onLive: (moves) => {
        if (moves) work.every(WITH_SIGNALS_MS);
        void work.refresh();
        this.settings.onChange();
      },
      onLost: () => {
        work.every(EVERY_MS);
        void work.refresh();
        this.settings.onChange();
      },
    });
    void this.signals.start();
  }

  // Reads the board again now (a ticket was made or answered).
  refresh(): void {
    void this.work?.refresh();
  }

  // Where the board learns which issues wait for "did it work?": the
  // records.
  waitFor(waiting: () => ReadonlySet<number>): void {
    this.waiting = waiting;
  }

  // Connects to the factory's board, again when the board changed (the
  // owner connected another one, or changed board.json by hand).
  connect(root: string): void {
    const board = JSON.stringify(readBoard(root));
    if (board === this.board) return;
    this.stop();
    this.board = board;
    const made = workFor({ ...this.settings, root }) ?? { problem: null };
    const working = "problem" in made ? null : made;
    this.problem = "problem" in made ? made.problem : null;
    this.work = working?.work ?? null;
    this.repository = working?.repository ?? "";
    this.codeHost = working?.codeHost ?? null;
    this.work?.start();
    this.startSignals();
  }

  stop(): void {
    this.signals?.stop();
    this.signals = null;
    this.work?.stop();
    this.work = null;
    this.codeHost = null;
    this.problem = null;
    this.board = "";
  }

  // For the Board tab's buttons.
  orRefuse(): BoardWork {
    if (!this.work)
      throw new Refused(
        this.problem ?? "Connect a board first: the builder works its cards.",
      );
    return this.work;
  }

  // Where the code lives, for the card panel and Resolve.
  hostOrRefuse(): CodeHost {
    this.orRefuse();
    if (!this.codeHost) throw new Refused("There is no code host yet.");
    return this.codeHost;
  }
}

function jsonOf(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
