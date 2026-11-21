// Kobble's own releases: whether one newer than the factory this project runs
// is out (the core's release-<version> tags), looked at when the factory
// starts and then once a day. Preparing it puts a card on the board, which
// the builder does like any card (the upgrade-factory skill: the new pin,
// npm install, software-factory upgrade, the checks) and opens as a pull
// request; once that is merged, every computer takes it with its next
// update (project-updates.ts).

import { compareVersions } from "@software-factory/core";

export type ReleaseView = {
  // The newest release, when it is newer than this factory's; else null.
  newest: string | null;
  // The card that prepares it, once there is one.
  card: { number: number; url: string } | null;
};

// The newest version among the core's tags ("refs/tags/release-0.12.0"),
// when it is newer than the one given.
export function newerRelease(tags: string[], current: string): string | null {
  const versions = tags
    .map((tag) => /release-(\d+\.\d+\.\d+)$/.exec(tag.trim())?.[1])
    .filter((version): version is string => version !== undefined)
    .sort(compareVersions);
  const newest = versions.at(-1) ?? null;
  return newest && compareVersions(newest, current) > 0 ? newest : null;
}

// The card's title, the same for everyone, so a second computer finds it
// on the board instead of making another.
export function upgradeTitle(version: string): string {
  return `Upgrade Kobble to ${version}`;
}

export function upgradeBody(from: string, to: string): string {
  return [
    `Kobble ${to} is out; this project's factory is on ${from}.`,
    "",
    "Use the upgrade-factory skill: pin the core at release " +
      `${to} in package.json, run npm install, then \`npx software-factory upgrade\`, ` +
      "and do what it leaves to the owner. Open the pull request with what " +
      "the upgrade did and what changed for the team (the core's CHANGELOG).",
    "",
    "Once it is merged, every computer takes it with its next update.",
  ].join("\n");
}

type Card = { number: number; title: string; url: string; closed: boolean };

type ReleasesOptions = {
  current: string;
  // The core's tags, as `git ls-remote --tags` lists them; null when GitHub
  // cannot be reached.
  tags: () => Promise<string[] | null>;
  // The board's cards, as last read.
  cards: () => Card[];
  onChange: () => void;
};

export class KobbleReleases {
  private newest: string | null = null;
  private offline = false;
  private checkedAt: string | null = null;
  private timer: NodeJS.Timeout | null = null;

  private readonly options: ReleasesOptions;

  constructor(options: ReleasesOptions) {
    this.options = options;
  }

  view(): ReleaseView {
    const { newest } = this;
    if (!newest) return { newest: null, card: null };
    const card = this.options
      .cards()
      .find((one) => one.title === upgradeTitle(newest));
    return {
      newest,
      card: card ? { number: card.number, url: card.url } : null,
    };
  }

  // Whether GitHub could not be reached the last time it was asked, and
  // when that was (an ISO time; null before the first look).
  status(): { offline: boolean; checkedAt: string | null } {
    return { offline: this.offline, checkedAt: this.checkedAt };
  }

  async look(): Promise<void> {
    const tags = await this.options.tags();
    const offline = tags === null;
    const newest = tags
      ? newerRelease(tags, this.options.current)
      : this.newest;
    const changed = newest !== this.newest || offline !== this.offline;
    this.newest = newest;
    this.offline = offline;
    this.checkedAt = new Date().toISOString();
    if (changed) this.options.onChange();
  }

  follow(everyMs = 24 * 60 * 60_000): () => void {
    void this.look();
    this.timer = setInterval(() => void this.look(), everyMs);
    this.timer.unref();
    return () => {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    };
  }
}
