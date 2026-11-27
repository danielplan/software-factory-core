// The plugs between extensions. Extensions are installed and removed, so
// they never call one another: each offers its plugs, and another one (or
// the core) uses them through the host's plug(name), which answers null
// while the extension offering it is not installed. Whoever uses a plug
// copes with null: it leaves that part out, or says plainly that the other
// extension is not installed. Sprocket's plug (kobble/support-plug.ts) and
// Home's (home.ts) are offered by many extensions at once.

import type { HomePlug } from "./home.ts";
import type { IdeasPlug } from "./ideas.ts";
import type { PersonasPlug } from "./personas.ts";
import type { SignalsPlug } from "./signals.ts";
import type { TestsPlug } from "./tests.ts";
import type { WorkPlug } from "./work.ts";

// The plugs one extension offers, each by one extension at most.
export type Plugs = {
  ideas: IdeasPlug;
  signals: SignalsPlug;
  personas: PersonasPlug;
  tests: TestsPlug;
  work: WorkPlug;
};

export type PlugName = keyof Plugs;

// What an extension offers: its plugs, and its Home blocks' data.
export type Offers = Partial<Plugs> & { home?: HomePlug };

// Another extension's plug, or null while none installed offers it.
export type PlugBoard = <N extends PlugName>(name: N) => Plugs[N] | null;
