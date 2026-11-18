import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type CallEvent,
  type CallState,
  idleCall,
  type ModelProgress,
  showsVoice,
  step,
} from "../src/voice/call.ts";
import { isFiller } from "../src/voice/fillers.ts";
import { LiveWords } from "../src/voice/live-words.ts";
import { statusLine } from "../src/voice/status-line.ts";
import {
  DRAFT_EVERY_MS,
  FRAME_SIZE,
  SAMPLE_RATE,
  VoiceDetector,
  WRITE_EARLY_AFTER_MS,
} from "../src/voice/voice-detector.ts";

// Hearing the owner quickly: the drafts while they speak and the words
// shown from them, the sentence handed over early once they go quiet (so it
// is sent right after the pause), fillers made up from a breath, a sound
// written quietly after sending, and the line while getting ready.

const frameMs = (FRAME_SIZE / SAMPLE_RATE) * 1000;
const frames = (level: number, ms: number) =>
  Array.from({ length: Math.ceil(ms / frameMs) }, () =>
    new Float32Array(FRAME_SIZE).fill(level),
  );
const seconds = (audio: Float32Array) => audio.length / SAMPLE_RATE;
const feed = (detector: VoiceDetector, all: Float32Array[]) =>
  all.flatMap((frame) => detector.feed(frame));
const withoutDrafts = (detector: VoiceDetector, all: Float32Array[]) =>
  feed(detector, all).filter((detected) => detected.type !== "draft");

test("drafts come about every half second while the owner speaks, then the sentence at the pause", () => {
  const detector = new VoiceDetector(1500);
  const handed = feed(detector, [...frames(0.001, 500), ...frames(0.2, 3000)]);
  const drafts = handed.filter((d) => d.type === "draft");
  assert.equal(handed[0]?.type, "voice");
  assert.ok(drafts.length >= 5);
  const lengths = drafts.map((d) => seconds(d.audio));
  for (let index = 1; index < lengths.length; index += 1)
    assert.ok(
      Math.abs(
        (lengths[index] ?? 0) -
          (lengths[index - 1] ?? 0) -
          DRAFT_EVERY_MS / 1000,
      ) < 0.05,
    );
  const sentence = feed(detector, frames(0.001, 1600)).at(-1);
  assert.ok(sentence?.type === "sentence" && sentence.early);
});

test("no drafts or early sentences while drafting is off", () => {
  const detector = new VoiceDetector(1500);
  detector.drafting = false;
  const handed = feed(detector, [...frames(0.2, 2000), ...frames(0.001, 1600)]);
  assert.deepEqual(
    handed.map((d) => d.type),
    ["voice", "sentence"],
  );
  const last = handed.at(-1);
  assert.ok(last?.type === "sentence" && !last.early);
});

test("the sentence is handed over once the owner is quiet for a moment, with all the voice", () => {
  const detector = new VoiceDetector(1500);
  assert.deepEqual(
    withoutDrafts(detector, frames(0.2, 1000)).map((d) => d.type),
    ["voice"],
  );
  const quiet = withoutDrafts(
    detector,
    frames(0.001, WRITE_EARLY_AFTER_MS + 40),
  );
  assert.deepEqual(
    quiet.map((d) => d.type),
    ["quiet"],
  );
  const sentence = withoutDrafts(detector, frames(0.001, 1500)).at(-1);
  if (quiet[0]?.type !== "quiet" || sentence?.type !== "sentence")
    throw new Error("No sentence.");
  assert.equal(sentence.early, true);
  // The early sentence is the same voice as the one at the pause.
  assert.deepEqual(
    sentence.audio.slice(0, quiet[0].audio.length),
    quiet[0].audio,
  );
});

test("speaking again after the quiet moment hands the longer sentence over again", () => {
  const detector = new VoiceDetector(1500);
  const handed = withoutDrafts(detector, [
    ...frames(0.2, 1000),
    ...frames(0.001, 500),
    ...frames(0.2, 600),
    ...frames(0.001, 200),
  ]);
  assert.deepEqual(
    handed.map((d) => d.type),
    ["voice", "quiet"],
  );
  const after = withoutDrafts(detector, frames(0.001, 1400));
  assert.deepEqual(
    after.map((d) => d.type),
    ["quiet", "sentence"],
  );
  // A short breath within a sentence hands nothing over.
  const breath = new VoiceDetector(1500);
  assert.deepEqual(
    withoutDrafts(breath, [
      ...frames(0.2, 1000),
      ...frames(0.001, WRITE_EARLY_AFTER_MS - 100),
      ...frames(0.2, 500),
    ]).map((d) => d.type),
    ["voice"],
  );
});

test("the words shown: what two drafts in a row agree on is settled, the rest grey", () => {
  const live = new LiveWords();
  assert.deepEqual(live.show("I would like"), {
    settled: "",
    grey: "I would like",
  });
  assert.deepEqual(live.show("I would like to paste a"), {
    settled: "I would like",
    grey: "to paste a",
  });
  // Capitals and punctuation aside, the words are the same.
  assert.deepEqual(live.show("I would like to paste, a picture"), {
    settled: "I would like to paste, a",
    grey: "picture",
  });
  assert.equal(live.show(" "), null);
});

test("fillers made up from a breath or a noise are not words", () => {
  for (const filler of ["Uh.", "Thank you.", "Grazie a tutti!", "Äh", "  "])
    assert.equal(isFiller(filler), true, filler);
  assert.equal(isFiller("Thank you, that is all"), false);
  assert.equal(isFiller("Ja"), false);
});

function run(events: CallEvent[], from: CallState) {
  let state = from;
  const effects = [];
  for (const event of events) {
    const next = step(state, event);
    state = next.state;
    effects.push(...next.effects);
  }
  return { state, effects };
}

const heard = (text: string): CallEvent => ({
  type: "heard",
  text,
  language: "en",
});

test("a sound after sending is written quietly, and joins only with real words", () => {
  const thinking: CallState = { ...idleCall(), phase: "thinking" };
  const listening: CallState = { ...idleCall(), phase: "listening" };
  const noise = run([{ type: "sentence" }], thinking);
  assert.equal(noise.state.quietly, true);
  assert.equal(noise.state.writing, false);
  assert.equal(run([heard("")], noise.state).state.quietly, false);
  for (const filler of ["Uh.", "Thank you.", "Grazie a tutti!"]) {
    assert.deepEqual(run([heard(filler)], noise.state).effects, []);
    assert.deepEqual(run([heard(filler)], listening).effects, []);
  }
  assert.deepEqual(run([heard("And by email")], noise.state).effects, [
    { type: "send", text: "And by email", language: "en" },
  ]);
  // While the coach speaks, a sound is not written at all.
  const speaking: CallState = { ...idleCall(), phase: "speaking" };
  assert.equal(run([{ type: "sentence" }], speaking).state, speaking);
});

test("a problem that ended the call stays in view until tried again or closed", () => {
  const preparing = run([{ type: "start" }], idleCall()).state;
  const stalled = run([{ type: "problem", problem: "stalled" }], preparing);
  assert.equal(stalled.state.phase, "off");
  assert.equal(showsVoice(stalled.state), true);
  assert.equal(showsVoice(idleCall()), false);
  assert.equal(showsVoice(preparing), true);
  const again = run([{ type: "start" }], stalled.state);
  assert.equal(again.state.phase, "preparing");
  assert.equal(again.state.problem, null);
  const closed = run([{ type: "end" }], stalled.state);
  assert.deepEqual(closed, { state: idleCall(), effects: [] });
});

test("getting ready names the model on its way, how far, and offers Try again", () => {
  const accurate: ModelProgress = {
    model: "accurate",
    fraction: 0.3,
    loaded: 168_000_000,
    total: 560_000_000,
    kept: false,
  };
  const quick: ModelProgress = {
    model: "quick",
    fraction: 0.5,
    loaded: 0,
    total: 0,
    kept: true,
  };
  const preparing: CallState = { ...idleCall(), phase: "preparing" };
  assert.deepEqual(
    statusLine({ ...preparing, progress: { accurate, quick } }, null),
    {
      text: "Downloading the accurate speech model, only the first time: 30% (168 of 560 MB)",
      problem: false,
      progress: 0.3,
    },
  );
  const quickLeft = {
    ...preparing,
    progress: { accurate: { ...accurate, fraction: 1 }, quick },
  };
  assert.equal(
    statusLine(quickLeft, null).text,
    "Getting ready, don't talk yet: loading the quick speech model… 50%",
  );
  const stalled = statusLine({ ...idleCall(), problem: "stalled" }, null);
  assert.equal(stalled.retry, true);
  assert.match(stalled.text, /stuck for 30 seconds/);
  assert.equal(
    statusLine({ ...idleCall(), problem: "download" }, null).retry,
    true,
  );
  assert.equal(
    statusLine({ ...idleCall(), problem: "blocked" }, null).retry,
    false,
  );
  assert.match(
    statusLine({ ...idleCall(), problem: "unsupported" }, null).text,
    /WebGPU/,
  );
});
