// Kobble's records, with every change to an exploration written to the usage
// log as well (usage-log.ts), when the company switched it on. A prototype
// the kobold made also keeps its change, as a patch from its branch.

import {
  type Board,
  type Conversation,
  type KobbleKind,
  type KobbleKinds,
  KobbleStore,
  run,
} from "@software-factory/core";

import {
  boardEvents,
  conversationEvents,
  explorationEvents,
  type UsageLog,
} from "./usage-log.ts";

export class LoggedStore extends KobbleStore {
  private readonly usage: UsageLog;
  private readonly project: string;

  constructor(factory: string, project: string, usage: UsageLog) {
    super(factory);
    this.project = project;
    this.usage = usage;
  }

  override put<K extends KobbleKind>(
    kind: K,
    record: KobbleKinds[K],
  ): KobbleKinds[K] {
    const before =
      kind === "explorations" ? this.get("explorations", record.id) : null;
    const saved = super.put(kind, record);
    if (kind === "explorations")
      this.usage.write(
        record.id,
        explorationEvents(before, saved as KobbleKinds["explorations"]),
      );
    return saved;
  }

  override saveBoard(id: string, board: Board): Board {
    const before = this.board(id);
    const saved = super.saveBoard(id, board);
    const events = boardEvents(before, saved);
    this.usage.write(id, events);
    for (const made of events.filter((e) => e.event === "prototype-made"))
      void this.keepPatch(id, String(made.key), String(made.branch));
    return saved;
  }

  override saveConversation(id: string, talk: Conversation): void {
    const before = this.conversation(id);
    super.saveConversation(id, talk);
    this.usage.write(id, conversationEvents(before, talk));
  }

  // The prototype's change, as the commit on its branch shows it.
  private async keepPatch(id: string, key: string, branch: string) {
    try {
      const patch = await run("git", ["-C", this.project, "show", branch]);
      const at = new Date().toISOString().replace(/[:.]/g, "-");
      this.usage.keep(id, `${key}-${at}.patch`, patch);
    } catch {
      // The log must never stop anyone's work.
    }
  }
}
