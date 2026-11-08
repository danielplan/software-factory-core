import assert from "node:assert/strict";
import { test } from "node:test";

import { readyToSay, sayable, spoken } from "../src/voice/answer-text.ts";
import {
  type CallEvent,
  type CallState,
  type Effect,
  HOLD_AFTER_SEND_MS,
  idleCall,
  step,
} from "../src/voice/call.ts";
import {
  browserLanguage,
  isLanguage,
  LANGUAGES,
} from "../src/voice/languages.ts";
import { statusLine } from "../src/voice/status-line.ts";
import { asksToStop, isInterruption } from "../src/voice/stop-words.ts";
import {
  cleanTranscript,
  pickLanguage,
  pieces,
  tokenOf,
} from "../src/voice/transcript.ts";
import {
  FRAME_SIZE,
  SAMPLE_RATE,
  VoiceDetector,
  voiceLevel,
} from "../src/voice/voice-detector.ts";

// The voice's plain rules: whose turn it is in a call, what of the coach's
// answer can be said, what stops it, which language was spoken, when a
// sentence starts and ends, and the line under the voice.

function run(events: CallEvent[], from: CallState = idleCall()) {
  let state = from;
  const effects: Effect[] = [];
  for (const event of events) {
    const next = step(state, event);
    state = next.state;
    effects.push(...next.effects);
  }
  return { state, effects };
}

const ready: CallEvent[] = [
  { type: "start" },
  { type: "progress", fraction: 0.5 },
  { type: "prepared" },
  { type: "tested", problem: null },
];

const types = (effects: Effect[]) => effects.map((e) => e.type);

test("a call gets ready, listens, sends what was heard and reads the answer out", () => {
  const started = run([{ type: "start" }]);
  assert.equal(started.state.phase, "preparing");
  assert.deepEqual(types(started.effects), ["prepare", "test-voice"]);
  assert.equal(run([{ type: "start" }], started.state).effects.length, 0);
  assert.equal(
    run([{ type: "start" }, { type: "progress", fraction: 0.5 }]).state
      .progress,
    0.5,
  );
  // Listening waits for both the model and the voice test.
  assert.equal(
    run([{ type: "start" }, { type: "prepared" }]).state.phase,
    "preparing",
  );
  const listening = run(ready);
  assert.equal(listening.state.phase, "listening");
  assert.deepEqual(types(listening.effects).at(-1), "listen");

  const writing = run([{ type: "sentence" }], listening.state);
  assert.equal(writing.state.writing, true);
  const sent = run(
    [{ type: "heard", text: " Hallo, wir sind Greenleaf ", language: "de" }],
    writing.state,
  );
  assert.equal(sent.state.phase, "thinking");
  assert.equal(sent.state.language, "de");
  assert.deepEqual(sent.effects, [
    { type: "send", text: "Hallo, wir sind Greenleaf", language: "de" },
    { type: "hold", ms: HOLD_AFTER_SEND_MS },
    { type: "cue" },
  ]);
  // Only noise: nothing happens.
  assert.deepEqual(
    run([{ type: "heard", text: " ", language: "en" }], listening.state)
      .effects,
    [],
  );

  const first = run(
    [{ type: "speech", text: "Got it. You sell plants", final: false }],
    sent.state,
  );
  assert.equal(first.state.phase, "speaking");
  assert.deepEqual(first.effects, [
    { type: "quick", on: true },
    { type: "say", text: "Got it.", language: "de" },
  ]);
  const rest = run(
    [{ type: "speech", text: "Got it. You sell plants.", final: true }],
    first.state,
  );
  assert.deepEqual(rest.effects, [
    { type: "say", text: "You sell plants.", language: "de" },
  ]);
  const done = run([{ type: "drained" }], rest.state);
  assert.equal(done.state.phase, "listening");
  assert.deepEqual(done.effects, [{ type: "quick", on: false }]);
});

test("the voice stops when asked, waits for more of the answer, and ends", () => {
  const thinking = run([
    ...ready,
    { type: "heard", text: "Hello", language: "en" },
  ]).state;
  const speaking = run(
    [{ type: "speech", text: "One. Two", final: false }],
    thinking,
  ).state;
  // Said everything so far, but the answer goes on: wait for it.
  assert.equal(run([{ type: "drained" }], speaking).state.phase, "thinking");
  // Its own echo is let go; "stop" stops it.
  assert.deepEqual(
    run([{ type: "heard", text: "One", language: "en" }], speaking).effects,
    [],
  );
  const stopped = run(
    [{ type: "heard", text: "Stop!", language: "en" }],
    speaking,
  );
  assert.equal(stopped.state.stopped, true);
  assert.deepEqual(types(stopped.effects), ["stop-voice", "quick"]);
  // The rest of a stopped answer is not read.
  assert.deepEqual(
    run([{ type: "speech", text: "One. Two.", final: true }], stopped.state)
      .effects,
    [],
  );
  // Said while the coach thinks: sent too, or a stop.
  assert.deepEqual(
    types(
      run([{ type: "heard", text: "And more", language: "en" }], thinking)
        .effects,
    ),
    ["send"],
  );
  assert.equal(
    run([{ type: "heard", text: "wait", language: "en" }], thinking).state
      .stopped,
    true,
  );
  // An answer without words says so out loud.
  const empty = run([{ type: "speech", text: "", final: true }], thinking);
  assert.deepEqual(empty.effects.at(-1), {
    type: "say",
    text: LANGUAGES.en.nothingToSay,
    language: "en",
  });
  // Everything of the answer was said already: listening again.
  const allSaid = run(
    [{ type: "drained" }, { type: "speech", text: "One.", final: true }],
    speaking,
  );
  assert.equal(allSaid.state.phase, "listening");
  assert.deepEqual(allSaid.effects, [{ type: "quick", on: false }]);
  assert.equal(
    run([{ type: "drained" }], run(ready).state).state.phase,
    "listening",
  );

  const ended = run([{ type: "end" }], speaking);
  assert.equal(ended.state.phase, "off");
  assert.deepEqual(types(ended.effects), ["stop-voice", "stop-listening"]);
  assert.deepEqual(run([{ type: "end" }]).effects, []);
  assert.deepEqual(
    run([{ type: "heard", text: "Hi", language: "en" }]).effects,
    [],
  );
});

test("a reply that failed, problems and the language", () => {
  const thinking = run([
    ...ready,
    { type: "heard", text: "Hello", language: "en" },
  ]).state;
  assert.equal(run([{ type: "failed" }], thinking).state.phase, "listening");
  assert.equal(run([{ type: "failed" }]).state.phase, "off");
  // A problem the call cannot go on with ends it.
  const blocked = run([{ type: "problem", problem: "blocked" }], thinking);
  assert.equal(blocked.state.phase, "off");
  assert.equal(blocked.state.problem, "blocked");
  assert.deepEqual(run([{ type: "problem", problem: "download" }]).effects, []);
  // Another one: back to listening.
  const notSent = run([{ type: "problem", problem: "not-sent" }], thinking);
  assert.equal(notSent.state.phase, "listening");
  assert.equal(
    run([{ type: "problem", problem: "voice-failed" }]).state.phase,
    "off",
  );
  const tested = run([
    { type: "start" },
    { type: "tested", problem: "no-voice" },
  ]);
  assert.equal(tested.state.problem, "no-voice");
  assert.equal(
    run([{ type: "language", language: "fr" }]).state.language,
    "fr",
  );
  // Events that do not fit the moment change nothing.
  for (const event of [
    { type: "prepared" },
    { type: "tested", problem: null },
    { type: "progress", fraction: 1 },
    { type: "sentence" },
  ] as CallEvent[])
    assert.equal(run([event]).state.phase, "off");
});

test("what of an answer can be said, and how it sounds", () => {
  assert.equal(readyToSay("One. Two"), "One.");
  assert.equal(readyToSay("Nothing finished"), "");
  assert.equal(sayable("One. Two", false, "", "en"), "One.");
  assert.equal(sayable(" One. Two ", true, "", "en"), "One. Two");
  assert.equal(sayable("", true, "", "it"), LANGUAGES.it.nothingToSay);
  assert.equal(sayable("", true, "Said.", "it"), "");
  assert.equal(
    spoken(
      "I've put **two products** on the canvas 🌱\n- a [shop](https://x.y)\n# Next",
    ),
    "I've put two products on the canvas\na shop\nNext",
  );
});

test("what stops the coach's voice", () => {
  assert.equal(asksToStop("Stopp bitte", ""), true);
  assert.equal(asksToStop("We sell plants", ""), false);
  // The coach's own words heard back from the speakers.
  assert.equal(
    asksToStop(
      "then we stop the old notebook",
      "Then we stop the old notebook.",
    ),
    false,
  );
  assert.equal(asksToStop("stop", "We stop the notebook."), true);
  assert.equal(isInterruption("a b c", "x"), true);
  assert.equal(isInterruption("the notebook", "the notebook is gone"), false);
});

test("which language a sentence was said in, and what was only noise", () => {
  const ids = { en: 0, de: 1, it: 2, fr: 3, es: 4 };
  assert.equal(pickLanguage([0.1, 0.9, 0.2, 0.3, 0.1], ids), "de");
  assert.equal(pickLanguage([0.5, 0.1, 0.2, 0.3, 0.9], ids), "es");
  assert.equal(pickLanguage([], ids), "en");
  assert.equal(tokenOf("fr"), "<|fr|>");
  assert.equal(cleanTranscript("  Thank you. "), "");
  assert.equal(cleanTranscript("Vielen Dank"), "");
  assert.equal(cleanTranscript(" We  sell plants "), "We sell plants");
  assert.equal(cleanTranscript("…"), "");
  assert.deepEqual(
    pieces(new Float32Array(60 * SAMPLE_RATE)).map((p) => p.length),
    [28 * SAMPLE_RATE, 28 * SAMPLE_RATE, 4 * SAMPLE_RATE],
  );
  assert.equal(isLanguage("de"), true);
  assert.equal(isLanguage("pt"), false);
  assert.equal(browserLanguage("de-CH"), "de");
  assert.equal(browserLanguage("pt-BR"), "en");
});

test("a sentence starts with a voice and ends after the pause; a cough is not one", () => {
  const loud = new Float32Array(FRAME_SIZE).fill(0.2);
  const quiet = new Float32Array(FRAME_SIZE);
  const detector = new VoiceDetector(100);
  const found = [
    ...Array.from({ length: 10 }, () => detector.feed(loud)),
    ...Array.from({ length: 5 }, () => detector.feed(quiet)),
  ].flat();
  assert.deepEqual(
    found.map((d) => d.type),
    ["voice", "sentence"],
  );
  const cough = new VoiceDetector(100);
  const coughed = [
    ...Array.from({ length: 3 }, () => cough.feed(loud)),
    ...Array.from({ length: 5 }, () => cough.feed(quiet)),
  ].flat();
  assert.deepEqual(
    coughed.map((d) => d.type),
    ["voice"],
  );
  assert.equal(voiceLevel(quiet), 0);
  assert.equal(voiceLevel(loud) > 0.5, true);
  assert.equal(voiceLevel(new Float32Array(FRAME_SIZE).fill(1)), 1);
});

test("the line under the voice", () => {
  const at = (state: Partial<CallState>) => ({ ...idleCall("de"), ...state });
  assert.deepEqual(statusLine(at({}), null), { text: "", problem: false });
  assert.match(
    statusLine(at({ phase: "preparing" }), null).text,
    /don't talk yet/,
  );
  assert.match(
    statusLine(at({ phase: "preparing", progress: 0.42 }), null).text,
    /42%/,
  );
  assert.match(statusLine(at({ phase: "listening" }), null).text, /Go ahead/);
  assert.match(
    statusLine(at({ phase: "listening", writing: true }), null).text,
    /Writing down/,
  );
  assert.match(statusLine(at({ phase: "thinking" }), null).text, /Working/);
  assert.match(statusLine(at({ phase: "speaking" }), null).text, /stop/);
  assert.deepEqual(statusLine(at({ problem: "no-voice" }), null), {
    text: "There's no Deutsch voice in this browser, so the answers can't be read out. Add one in the computer's speech settings, or choose another language.",
    problem: true,
  });
  assert.match(statusLine(at({ problem: "blocked" }), null).text, /allow/);
  assert.deepEqual(statusLine(at({}), "The coach stopped."), {
    text: "The coach stopped.",
    problem: true,
  });
});
