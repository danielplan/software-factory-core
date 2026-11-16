// What the kobold is told for each of its Understand jobs: the job, and the
// records it needs, in short plain lines. Its method is the understand
// skill, given as its instructions.

import type { Records, Signal, Story } from "@software-factory/core";

import type { OwnIdea } from "../explore/own-idea.ts";

// Sorting one signal: who it may sound like, and every story it may be
// evidence in, with each scene seen or guessed.
export function sortPrompt(
  records: Records,
  signal: Signal,
  hint: string | null,
): string {
  return [
    "Sort the one signal below, as the understand skill says, and put it in its place with sort_signal, once.",
    "",
    signalLines(records, signal),
    ...(hint ? ["", `The person who moved it says: ${hint}`] : []),
    "",
    ...recordLines(records),
  ].join("\n");
}

// Answering a question someone asked about the people who use the product
// (Ask the kobold, at the top of every page), from the records alone;
// nothing is written.
export function answerPrompt(records: Records, question: string): string {
  return [
    "Someone on the team asks the question below about the people who use the product. Answer it from the records below, in two to four short, plain sentences, naming the persona or story the answer comes from. When the records do not tell, say so in a sentence. Write nothing and call no tool.",
    "",
    `The question: ${question.trim()}`,
    "",
    ...recordLines(records),
  ].join("\n");
}

// Suggesting a real problem behind problems of one persona that have none.
export function suggestPrompt(records: Records, persona: string): string {
  const free = records.problems.filter(
    (p) => p.persona === persona && p.realProblem === null,
  );
  const others = records.realProblems.filter((r) => r.persona === persona);
  return [
    "These problems of one persona have no real problem behind them yet. If two or more of them point the same way, suggest the real problem behind them with suggest_real_problem, once. If they do not, say so in a line and call nothing.",
    "",
    ...personaLines(records).filter((line) => line.startsWith(`- ${persona}:`)),
    "",
    "Their problems with no real problem behind them:",
    ...free.map((p) => `- ${p.id}: ${p.title}. ${p.reading}`),
    ...(others.length > 0
      ? [
          "",
          "Real problems they have already:",
          ...others.map((r) => `- ${r.title}`),
        ]
      : []),
  ].join("\n");
}

// Drafting a short question for people like the persona, about the scenes
// of a story nobody has seen yet.
export function askPrompt(records: Records, story: Story): string {
  const persona = records.personas.find((p) => p.id === story.persona);
  const guessed = [
    ...story.scenes.filter((s) => s.evidence.length === 0).map((s) => s.text),
    ...(story.instead && story.instead.evidence.length === 0
      ? [`Instead: ${story.instead.text}`]
      : []),
  ];
  return [
    `Draft a short message to send to two people like ${persona?.name ?? story.persona} (${persona?.role ?? "a user"}), to learn what really happens in the guessed scenes of this story. Ask about what they did the last time, not about what they would do or want. Answer with the message only, ready to copy: a greeting, two or three questions, a thank-you.`,
    "",
    `The story: “${story.title}”. Starts: ${story.starts || "not said"}. Wants: ${story.wants || "not said"}.`,
    ...story.scenes.map(
      (s, at) =>
        `${String(at + 1)}. [${s.evidence.length > 0 ? "seen" : "guessed"}] ${s.text}`,
    ),
    "",
    "Guessed:",
    ...guessed.map((text) => `- ${text}`),
  ].join("\n");
}

// Writing a team member's own idea, with the story it assumes behind it.
export function ideaPrompt(records: Records, own: OwnIdea): string {
  const told = records.stories.filter(
    (s) => s.persona === own.persona && s.wrong === null,
  );
  return [
    `${own.by} has an idea for ${own.persona}. Write it with the story it assumes, as the explore skill says, with write_idea, once.`,
    "",
    `The idea, in their words: ${own.text.trim()}`,
    "",
    ...personaLines(records).filter((line) =>
      line.startsWith(`- ${own.persona}:`),
    ),
    "",
    "The stories already told about them:",
    ...told.map((s) => `- “${s.title}”, starts: ${s.starts || "not said"}`),
  ].join("\n");
}

function signalLines(records: Records, signal: Signal): string {
  const source = records.sources.find((s) => s.id === signal.source);
  const who = records.customers.find((c) => c.id === signal.who);
  const kind =
    source?.kind === "personaRuns"
      ? "personaRuns: never evidence about real people"
      : (source?.kind ?? "unknown kind");
  const parts = [
    `The signal ${signal.id}, from “${source?.name ?? signal.source}” (${kind})`,
    ...(who ? [`said by ${who.name}, a customer like ${who.persona}`] : []),
    ...(signal.when ? [signal.when] : []),
  ];
  return `${parts.join(", ")}:\n${signal.text}`;
}

// The personas, their problems and their stories.
function recordLines(records: Records): string[] {
  return [
    ...personaLines(records),
    "",
    ...problemLines(records),
    "",
    ...storyLines(records),
  ];
}

function personaLines(records: Records): string[] {
  return [
    "The personas:",
    ...records.personas.map((p) => {
      const wants = p.wants.length > 0 ? ` Wants: ${p.wants.join("; ")}.` : "";
      return `- ${p.id}: ${p.name}, ${p.role}. ${p.description}${wants}`;
    }),
  ];
}

function problemLines(records: Records): string[] {
  return [
    "The problems:",
    ...records.problems.map(
      (p) =>
        `- ${p.id} (${p.persona}): ${p.title}${p.assumed ? " [assumed, from an idea]" : ""}`,
    ),
  ];
}

// The stories that hold, each scene numbered from 1, seen or guessed, with
// the one it breaks at marked.
function storyLines(records: Records): string[] {
  const told = records.stories.filter((s) => s.wrong === null);
  return [
    "The stories (scenes numbered from 1):",
    ...told.flatMap((story) => [
      `- ${story.id} (${story.persona}): “${story.title}”, breaks at the problem ${story.problem ?? "none"}`,
      ...story.scenes.map((s, at) => {
        const known = s.evidence.length > 0 ? "seen" : "guessed";
        const breaks = s.breaks ? ", breaks here" : "";
        const where = s.where ? s.where + ": " : "";
        return `  ${String(at + 1)}. [${known}${breaks}] ${where}${s.text}`;
      }),
    ]),
  ];
}
