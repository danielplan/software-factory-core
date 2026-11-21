// Kobble's own releases: whether one newer than the factory this project runs
// is out (the core's release-<version> tags), looked at when the factory
// starts and then once a day. Preparing it puts a card on the board, which
// the builder does like any card (the upgrade-factory skill: the new pin,
// npm install, software-factory upgrade, the checks) and opens as a pull
// request; once that is merged, every computer takes it with its next
// update (project-updates.ts).

import { compareVersions, RELEASE_SOURCE } from "@software-factory/core";

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
      "the upgrade did and what changed for the team (the core's commits " +
      `between the two releases: ${compareUrl(from, to)}).`,
    "",
    "Once it is merged, every computer takes it with its next update.",
  ].join("\n");
}

type Card = { number: number; title: string; url: string; closed: boolean };

type ReleasesOptions = {
  current: string;
  // The core's tags, as `git ls-remote --tags` lists them; none when GitHub
  // cannot be reached.
  tags: () => Promise<string[]>;
  // The board's cards, as last read.
  cards: () => Card[];
  onChange: () => void;
};

export class KobbleReleases {
  private newest: string | null = null;
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

  async look(): Promise<void> {
    const newest = newerRelease(
      await this.options.tags(),
      this.options.current,
    );
    if (newest === this.newest) return;
    this.newest = newest;
    this.options.onChange();
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

// The core's commits between two releases, on GitHub.
function compareUrl(from: string, to: string): string {
  const repository = RELEASE_SOURCE.replace(/^github:/, "");
  return `https://github.com/${repository}/compare/v${from}...v${to}`;
}
