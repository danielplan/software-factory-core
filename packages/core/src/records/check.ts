// The rules every product's records keep, checked as a whole: on every
// write (the store refuses a write that breaks one) and by
// `software-factory check`. Each problem is said in a line, with the record
// it is about.
//
// - A signal has its source; only machine errors are counted; only a bug
//   or an update goes to Build straight from it.
// - A signal that feeds a problem or a story sounds like that persona, and
//   never comes from a persona run: persona runs are not evidence.
// - A story breaks exactly once, at a problem of the same persona, unless it
//   is marked wrong.
// - A problem has signals behind it, or it is assumed and comes from an
//   idea's story; a story breaks at it.
// - A real problem sits behind at least two problems of the same persona.
// - A ticket link comes from a version (an idea's ticket) or from a signal
//   (a fix or an update).

import {
  KINDS,
  keyOf,
  type Kind,
  RECORD_NAMES as NAMES,
  type Problem,
  type RecordOf,
  type Records,
  type Signal,
  type Story,
  type TicketLink,
  versionKey,
} from "./schemas.ts";

type Index = { [K in Kind]: Map<string, RecordOf<K>> };
type Say = (problem: string) => void;
type Context = { records: Records; index: Index };

export function checkRecords(records: Records): string[] {
  const found: string[] = [];
  const index = indexOf(records, (problem) => found.push(problem));
  const context = { records, index };
  const each = <K extends Kind>(
    kind: K,
    rule: (record: RecordOf<K>, say: Say, context: Context) => void,
  ) => {
    for (const record of records[kind]) {
      const name = `${NAMES[kind]} ${keyOf(record)}`;
      rule(record, (problem) => found.push(`${name}: ${problem}`), context);
    }
  };
  each("signals", checkSignal);
  each("customers", (c, say) => {
    needs(index.personas, c.persona, "persona", say);
  });
  each("realProblems", checkRealProblem);
  each("problems", checkProblem);
  each("stories", checkStory);
  each("ideas", checkIdea);
  each("versions", (v, say) => {
    needs(index.ideas, v.idea, "idea", say);
  });
  each("ticketLinks", checkTicketLink);
  each("outcomes", (o, say) => {
    if (!index.ticketLinks.has(String(o.issue)))
      say(`there is no ticket #${String(o.issue)} for it to answer.`);
  });
  return found;
}

// Every record by its key; two with the same key are a problem.
function indexOf(records: Records, say: Say): Index {
  const index = {} as Record<Kind, Map<string, RecordOf<Kind>>>;
  for (const kind of KINDS) {
    const map = new Map<string, RecordOf<Kind>>();
    for (const record of records[kind]) {
      const key = keyOf(record);
      if (map.has(key)) say(`${NAMES[kind]} ${key} is there twice.`);
      map.set(key, record);
    }
    index[kind] = map;
  }
  return index as Index;
}

function needs(map: Map<string, unknown>, id: string, what: string, say: Say) {
  if (!map.has(id)) say(`its ${what} “${id}” is not there.`);
}

function checkSignal(signal: Signal, say: Say, { index }: Context): void {
  const source = index.sources.get(signal.source);
  if (!source) say(`its source “${signal.source}” is not there.`);
  if (signal.who !== null) needs(index.customers, signal.who, "customer", say);
  if (signal.soundsLike !== null)
    needs(index.personas, signal.soundsLike, "persona", say);
  if (signal.n !== undefined && source?.kind !== "errors")
    say("only machine errors are counted: a signal from people stays single.");
  checkWentTo(signal, say, index);
}

// Where a signal went is there, and a story or a problem it feeds is of the
// persona it sounds like.
function checkWentTo(signal: Signal, say: Say, index: Index): void {
  const to = signal.wentTo;
  if (to?.to === "build" && !["bug", "update"].includes(signal.sortedAs))
    say("only a bug or an update goes to Build straight from a signal.");
  if (to === null || to.to === "answered" || to.to === "build") return;
  if (to.to === "ticket") {
    if (!index.ticketLinks.has(String(to.issue)))
      say(`the ticket #${String(to.issue)} it went to is not there.`);
    return;
  }
  const target =
    to.to === "problem" ? index.problems.get(to.id) : index.stories.get(to.id);
  if (!target) say(`the ${to.to} “${to.id}” it went to is not there.`);
  else {
    const wrong = feeding(signal, target.persona, index);
    if (wrong) say(`it went to the ${to.to} ${to.id}, but ${wrong}`);
  }
}

// Why a signal cannot feed a story or a problem of this persona, or null
// when it can.
function feeding(signal: Signal, persona: string, index: Index) {
  if (index.sources.get(signal.source)?.kind === "personaRuns")
    return "it comes from a persona run, which is never evidence about real people.";
  if (signal.soundsLike !== persona)
    return `it sounds like ${signal.soundsLike ?? "no persona yet"}, not like ${persona}.`;
  return null;
}

function checkRealProblem(
  real: RecordOf<"realProblems">,
  say: Say,
  { records, index }: Context,
): void {
  needs(index.personas, real.persona, "persona", say);
  const under = records.problems.filter((p) => p.realProblem === real.id);
  if (under.length < 2)
    say(
      `it sits behind ${String(under.length)} problem(s): a real problem sits behind at least two problems of one persona.`,
    );
  for (const problem of under)
    if (problem.persona !== real.persona)
      say(
        `the problem ${problem.id} under it is ${problem.persona}'s, not ${real.persona}'s.`,
      );
}

function checkProblem(problem: Problem, say: Say, context: Context): void {
  const { records, index } = context;
  needs(index.personas, problem.persona, "persona", say);
  if (problem.realProblem !== null)
    needs(index.realProblems, problem.realProblem, "real problem", say);
  const behind = signalsBehind(records, problem.id);
  if (problem.assumed) {
    if (behind.length > 0)
      say(
        "it is marked assumed, but signals are behind it: once people say it, it is no longer assumed.",
      );
    if (
      !records.stories.some((s) => s.problem === problem.id && "idea" in s.from)
    )
      say(
        "it is assumed, so it comes from an idea's story, and none breaks at it.",
      );
  } else if (behind.length === 0)
    say(
      "no signals are behind it: a problem comes from what people said, or is marked assumed when it comes from an idea.",
    );
  if (!records.stories.some((s) => s.problem === problem.id))
    say("no story breaks at it.");
}

// The signals that went to a problem, or to one of its stories (persona runs
// never count).
export function signalsBehind(records: Records, problem: string): Signal[] {
  const stories = new Set(
    records.stories.filter((s) => s.problem === problem).map((s) => s.id),
  );
  const runs = new Set(
    records.sources.filter((s) => s.kind === "personaRuns").map((s) => s.id),
  );
  return records.signals.filter((signal) => {
    const to = signal.wentTo;
    const goes =
      (to?.to === "problem" && to.id === problem) ||
      (to?.to === "story" && stories.has(to.id));
    return goes && !runs.has(signal.source);
  });
}

function checkStory(story: Story, say: Say, { index }: Context): void {
  needs(index.personas, story.persona, "persona", say);
  const evidence = (id: string, where: string) => {
    const signal = index.signals.get(id);
    if (!signal) say(`the signal “${id}” ${where} is not there.`);
    else {
      const wrong = feeding(signal, story.persona, index);
      if (wrong) say(`the signal ${id} ${where} cannot count: ${wrong}`);
    }
  };
  if ("idea" in story.from) needs(index.ideas, story.from.idea, "idea", say);
  else for (const id of story.from.signals) evidence(id, "it comes from");
  story.scenes.forEach((scene, at) => {
    for (const id of scene.evidence) evidence(id, `in scene ${String(at + 1)}`);
  });
  for (const id of story.instead?.evidence ?? []) evidence(id, "in instead");
  checkBreak(story, say, index);
}

function checkBreak(story: Story, say: Say, index: Index): void {
  if (story.wrong !== null) {
    if (story.problem !== null)
      say("it is marked wrong, so it breaks at no problem.");
    return;
  }
  const breaks = story.scenes.filter((scene) => scene.breaks).length;
  if (breaks !== 1)
    say(
      `it breaks ${String(breaks)} times: a story breaks exactly once, unless it is marked wrong.`,
    );
  if (story.problem === null) {
    say("it breaks at no problem: it needs one, unless it is marked wrong.");
    return;
  }
  const problem = index.problems.get(story.problem);
  if (!problem) say(`its problem “${story.problem}” is not there.`);
  else if (problem.persona !== story.persona)
    say(
      `its problem ${problem.id} is ${problem.persona}'s, not ${story.persona}'s.`,
    );
}

function checkIdea(
  idea: RecordOf<"ideas">,
  say: Say,
  { index }: Context,
): void {
  if (idea.origin.from === "problem")
    needs(index.problems, idea.origin.id, "problem", say);
  for (const id of idea.problems) needs(index.problems, id, "problem", say);
  if (idea.persona !== null)
    needs(index.personas, idea.persona, "persona", say);
  else if (idea.problems.length === 0)
    say("it is for no problem, so it names the persona it is for.");
}

function checkTicketLink(
  ticket: TicketLink,
  say: Say,
  { index }: Context,
): void {
  for (const id of ticket.problems) needs(index.problems, id, "problem", say);
  if ("signal" in ticket.from) {
    needs(index.signals, ticket.from.signal, "signal", say);
    if (ticket.kind === "idea")
      say("an idea's ticket comes from a version of the idea, not a signal.");
    return;
  }
  const { idea, version } = ticket.from;
  if (!index.versions.has(versionKey(idea, version)))
    say(`its version ${version} of the idea “${idea}” is not there.`);
  if (ticket.kind !== "idea")
    say(`a ${ticket.kind} comes from a signal, not from an idea's version.`);
  const addresses = index.ideas.get(idea)?.problems ?? [];
  for (const id of ticket.problems)
    if (!addresses.includes(id))
      say(`it is for the problem ${id}, which its idea does not address.`);
}
