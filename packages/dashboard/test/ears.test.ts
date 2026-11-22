import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

import type { ModelProgress } from "../src/lib/voice/call.ts";
import { type Hearing, WhisperEars } from "../src/lib/voice/ears.ts";
import type { Shown } from "../src/lib/voice/live-words.ts";
import { MicrophoneError } from "../src/lib/voice/microphone.ts";
import { Recogniser } from "../src/lib/voice/recogniser.ts";
import { FRAME_SIZE, SAMPLE_RATE } from "../src/lib/voice/voice-detector.ts";
import type { Ask, Tell } from "../src/lib/voice/whisper-worker.ts";

// The ears with the speech models' worker and the microphone pretended: the
// quick model's drafts while the owner speaks; the accurate model writing
// the sentence once they go quiet, used at the pause when they did not
// speak again, so the words go out right after it; a model still busy skips
// a draft or the early writing; getting ready that hangs is reported.

// The workers made, and how they answer: at once, as the test says; a job
// they hold stays busy.
const workers: PretendWorker[] = [];
const noAnswer = (_ask: Ask): Tell | null => null;
let answer = noAnswer;

class PretendWorker {
  onmessage: ((event: { data: Tell }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    workers.push(this);
  }
  postMessage(ask: Ask) {
    const told = answer(ask);
    if (told)
      queueMicrotask(() => {
        this.tell(told);
      });
  }
  tell(told: Tell) {
    this.onmessage?.({ data: told });
  }
}

// The microphone hands each frame to the ears by hand.
class PretendMicrophone {
  frame: ((frame: Float32Array) => void) | null = null;
  refuse: Error | null = null;
  async open(onFrame: (frame: Float32Array) => void) {
    if (this.refuse) throw this.refuse;
    this.frame = onFrame;
  }
  close() {
    this.frame = null;
  }
}

const frameMs = (FRAME_SIZE / SAMPLE_RATE) * 1000;
const frames = (level: number, ms: number) =>
  Array.from({ length: Math.ceil(ms / frameMs) }, () =>
    new Float32Array(FRAME_SIZE).fill(level),
  );
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const pause = Math.ceil(1500 / frameMs);

function recorder() {
  const heard: string[] = [];
  const shown: Shown[] = [];
  const problems: string[] = [];
  const hearing: Hearing = {
    voice: () => {},
    draft: (words) => shown.push(words),
    sentence: () => {},
    heard: (text) => heard.push(text),
    level: () => {},
    problem: (problem) => problems.push(problem),
  };
  return { heard, shown, problems, hearing };
}

const SAID = "Export the orders.";

beforeEach(() => {
  workers.length = 0;
  answer = noAnswer;
  (globalThis as { Worker?: unknown }).Worker = PretendWorker;
});
afterEach(() => {
  delete (globalThis as { Worker?: unknown }).Worker;
});

// The owner speaks as the frames say; what the worker was asked, and at
// which frame, comes back.
async function talk(
  sound: Float32Array[],
  answers: (ask: Ask, writes: number) => Tell | null,
) {
  const microphone = new PretendMicrophone();
  const ears = new WhisperEars(microphone, new Recogniser());
  let writes = 0;
  let frame = 0;
  const asked: { ask: Ask; frame: number }[] = [];
  answer = (ask) => {
    asked.push({ ask, frame });
    if (ask.type === "write") writes += 1;
    return answers(ask, writes);
  };
  assert.equal(await ears.prepare(() => {}), null);
  const { heard, shown, hearing } = recorder();
  ears.hearIn("en");
  await ears.start(hearing);
  for (const [index, sample] of sound.entries()) {
    frame = index;
    microphone.frame?.(sample);
    await settle();
  }
  ears.stop();
  const writing = asked.filter(({ ask }) => ask.type === "write");
  return { heard, shown, writing, asked };
}

// The worker answers every job, except the write it is told to hold.
const answers =
  (held = 0) =>
  (ask: Ask, writes: number): Tell | null => {
    if (ask.type === "prepare") return { type: "prepared" };
    if (ask.type === "draft")
      return { type: "drafted", id: ask.id, text: SAID };
    if (writes === held) return null;
    const text = `Sentence ${String(writes)}.`;
    return { type: "written", id: ask.id, text, language: "en" };
  };

test("the ears show the quick model's drafts while the owner speaks", async () => {
  const { shown, asked } = await talk(
    [...frames(0.2, 1500), ...frames(0.001, 1600)],
    answers(),
  );
  assert.deepEqual(shown.at(-1), { settled: SAID, grey: "" });
  const drafts = asked.filter(({ ask }) => ask.type === "draft");
  assert.ok(drafts.length >= 2);
});

test("the ears write the sentence as soon as the owner goes quiet, and use it at the pause", async () => {
  const speaking = frames(0.2, 1500);
  const { heard, writing } = await talk(
    [...speaking, ...frames(0.001, 1600)],
    answers(),
  );
  assert.equal(writing.length, 1);
  // Asked about 0.3 s into the quiet, long before the pause.
  assert.ok((writing[0]?.frame ?? 0) - speaking.length < pause / 3);
  assert.deepEqual(heard, ["Sentence 1."]);
});

test("the ears let the early writing go when the owner speaks again", async () => {
  const { heard, writing } = await talk(
    [
      ...frames(0.2, 1000),
      ...frames(0.001, 500),
      ...frames(0.2, 600),
      ...frames(0.001, 1600),
    ],
    answers(),
  );
  assert.equal(writing.length, 2);
  assert.deepEqual(heard, ["Sentence 2."]);
});

test("the ears write at the pause when the accurate model was still busy", async () => {
  const { heard, writing } = await talk(
    [
      ...frames(0.2, 1000),
      ...frames(0.001, 500),
      ...frames(0.2, 600),
      ...frames(0.001, 1600),
    ],
    answers(1),
  );
  assert.equal(writing.length, 2);
  assert.ok((writing[1]?.frame ?? 0) > (writing[0]?.frame ?? 0) + pause);
  assert.deepEqual(heard, ["Sentence 2."]);
});

test("the ears rest after a turn, end sentences sooner while the coach speaks, and say why the microphone failed", async () => {
  const microphone = new PretendMicrophone();
  const ears = new WhisperEars(microphone, new Recogniser());
  answer = (ask) => answers()(ask, 1);
  const { heard, problems, hearing } = recorder();
  await ears.start(hearing);
  ears.hold(10_000);
  for (const sample of [...frames(0.2, 1000), ...frames(0.001, 1600)])
    microphone.frame?.(sample);
  await settle();
  assert.deepEqual(heard, []);
  ears.hold(0);
  ears.quick(true);
  for (const sample of [...frames(0.2, 500), ...frames(0.001, 600)])
    microphone.frame?.(sample);
  await settle();
  await settle();
  assert.deepEqual(heard, ["Sentence 1."]);
  microphone.refuse = new MicrophoneError("blocked", new Error("No."));
  await ears.start(hearing);
  microphone.refuse = new Error("Odd.");
  await ears.start(hearing);
  assert.deepEqual(problems, ["blocked", "microphone-failed"]);
});

test("the speech models' page side skips a draft or an early writing while its model is busy", async () => {
  const recogniser = new Recogniser();
  const audio = () => new Float32Array(SAMPLE_RATE);
  const first = recogniser.draft(audio(), "en");
  const worker = workers[0];
  assert.ok(first && worker);
  assert.equal(recogniser.draft(audio(), "en"), null);
  // The accurate model is free: the quick one's work does not hold it.
  const early = recogniser.writeEarly(audio(), "de");
  assert.ok(early);
  assert.equal(recogniser.writeEarly(audio(), "de"), null);
  // Writing at the pause waits its turn instead.
  const late = recogniser.write(audio(), "de");
  worker.tell({ type: "drafted", id: 1, text: "Exportiere" });
  assert.equal(await first, "Exportiere");
  assert.ok(recogniser.draft(audio(), "en"));
  worker.tell({ type: "failed", id: 3, details: "Out of memory." });
  await assert.rejects(late, /Out of memory\./);
  worker.tell({ type: "written", id: 2, text: "Exportiere.", language: "de" });
  assert.equal(await early, "Exportiere.");
});

test("the speech models' page side passes on progress, and says when getting ready hangs for 30 seconds", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const recogniser = new Recogniser();
    const progress: ModelProgress[] = [];
    const ready = recogniser.prepare((step) => progress.push(step));
    const worker = workers[0];
    assert.ok(worker);
    mock.timers.tick(20_000);
    const quick: ModelProgress = {
      model: "quick",
      fraction: 0.5,
      loaded: 75,
      total: 150,
      kept: false,
    };
    worker.tell({ type: "progress", progress: quick });
    assert.deepEqual(progress, [quick]);
    // Progress starts the 30 seconds again.
    mock.timers.tick(20_000);
    let done: string | null | undefined;
    void ready.then((problem) => (done = problem));
    await Promise.resolve();
    assert.equal(done, undefined);
    mock.timers.tick(10_001);
    assert.equal(await ready, "stalled");
  } finally {
    mock.timers.reset();
  }
});

test("the speech models' page side says why the models could not be got", async () => {
  const recogniser = new Recogniser();
  const ready = recogniser.prepare(() => {});
  workers[0]?.tell({
    type: "problem",
    problem: "unsupported",
    details: "No WebGPU.",
  });
  assert.equal(await ready, "unsupported");
  const again = recogniser.prepare(() => {});
  workers[0]?.onerror?.();
  assert.equal(await again, "download");
});
