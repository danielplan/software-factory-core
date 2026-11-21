// Updates in the factory: the owner's folder follows GitHub's main (see
// project-updates.ts), looked at every few minutes once a factory is open.
// After an update, by a press or by itself: what the changes need is
// installed when their package files changed; when that brings a new
// Kobble, the factory itself starts again on it (with the products that
// ran); otherwise the products that run start again. Beside it, whether a
// newer Kobble is out (kobble-release.ts), and preparing it as a card. The
// sidebar shows it when something needs the owner; Settings › Updates has
// the switch.

import {
  chooseUpdatesByItself,
  FACTORY_FOLDER,
  hasFactory,
  updatesByItself,
} from "@software-factory/core";
import { join } from "node:path";

import type { Route } from "../add-ons/add-on.ts";
import { on } from "../asked.ts";
import {
  KobbleReleases,
  type ReleaseView,
  upgradeBody,
  upgradeTitle,
} from "./kobble-release.ts";
import { WhatsNew, type WhatsNewFiles } from "./whats-new.ts";
import {
  type AfterUpdate,
  type Git,
  ProjectUpdates,
  type UpdatesState,
} from "./project-updates.ts";

export type UpdatesView = UpdatesState & { release: ReleaseView };

export type UpdatesOptions = {
  project: string;
  // The products that run now, to start again after an update.
  restartRunning: () => Promise<void>;
  // npm install in the project.
  install: () => Promise<void>;
  // True when the project's package.json pins another Kobble than the one
  // this factory runs.
  newKobble: () => boolean;
  // The factory starting again on the Kobble now installed; none where the
  // factory cannot.
  restartFactory?: () => Promise<void>;
  releases: {
    current: string;
    tags: () => Promise<string[] | null>;
    // What's new: this computer's files, and a newer release's from GitHub.
    local: () => WhatsNewFiles;
    files: (version: string) => Promise<WhatsNewFiles | null>;
    cards: () => {
      number: number;
      title: string;
      url: string;
      closed: boolean;
    }[];
    // Puts a card in To do on the connected board.
    create: (title: string, body: string) => Promise<unknown>;
  };
  onChange: () => void;
  git?: Git;
  everyMs?: number;
};

// The files whose change means npm install.
const PACKAGE_FILES = /(^|\/)package(-lock)?\.json$/;

export function afterUpdate(
  options: Pick<
    UpdatesOptions,
    "install" | "newKobble" | "restartFactory" | "restartRunning"
  >,
): AfterUpdate {
  return async (changed, say) => {
    if (changed.some((file) => PACKAGE_FILES.test(file))) {
      say("Installing what the changes need");
      await options.install();
      if (options.newKobble() && options.restartFactory) {
        say("Starting the factory again on the new Kobble");
        await options.restartFactory();
        return;
      }
    }
    say("Starting the products again");
    await options.restartRunning();
  };
}

export function servedUpdates(options: UpdatesOptions) {
  const factory = join(options.project, FACTORY_FOLDER);
  const updates = new ProjectUpdates({
    root: options.project,
    choice: {
      read: () => hasFactory(factory) && updatesByItself(factory),
      write: (yes: boolean) => {
        chooseUpdatesByItself(factory, yes);
      },
    },
    after: afterUpdate(options),
    ...(options.git ? { git: options.git } : {}),
  });
  const releases = new KobbleReleases({
    ...options.releases,
    onChange: options.onChange,
  });
  updates.subscribe(() => {
    options.onChange();
  });
  const whatsNew = new WhatsNew({
    current: options.releases.current,
    local: options.releases.local,
    files: options.releases.files,
  });
  const view = (): UpdatesView => ({
    ...updates.state,
    release: releases.view(),
  });
  let stops: (() => void)[] = [];
  const routes: Record<string, Route> = {
    "GET /api/updates": view,
    // What each Kobble release changed, in the page's language.
    "GET /api/updates/whats-new": (_body, url) =>
      whatsNew.view(url.searchParams.get("language") ?? "en", {
        newest: releases.view().newest,
        ...releases.status(),
      }),
    "POST /api/updates/look": async () => {
      await Promise.all([updates.look(), releases.look()]);
    },
    "POST /api/updates/update": () => updates.update(),
    "POST /api/updates/by-itself": (body) => {
      updates.chooseByItself(on(body));
    },
    // The upgrade to the newest Kobble, as a card for the builder; the one
    // already on the board when there is one.
    "POST /api/updates/prepare-release": async () => {
      const { newest, card } = releases.view();
      if (!newest || card) return view();
      await options.releases.create(
        upgradeTitle(newest),
        upgradeBody(options.releases.current, newest),
      );
      options.onChange();
      return view();
    },
  };
  return {
    routes,
    start: () => {
      if (!hasFactory(factory)) return;
      void updates.look();
      stops = [updates.follow(options.everyMs), releases.follow()];
    },
    close: () => {
      for (const stop of stops) stop();
      stops = [];
    },
  };
}
