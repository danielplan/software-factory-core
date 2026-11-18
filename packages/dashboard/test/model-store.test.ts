import assert from "node:assert/strict";
import { test } from "node:test";

import { type Folder, ModelStore } from "../src/voice/model-store.ts";

// The speech models' files kept in the browser's file store, with a pretend
// file store in memory: which model downloads, what is kept, an interrupted
// write, and the files an earlier version used being removed.

function pretendFolder(failWrites = false) {
  const files = new Map<string, Uint8Array>();
  const handle = (name: string) => ({
    async getFile() {
      const bytes = files.get(name);
      if (!bytes) throw new DOMException("missing", "NotFoundError");
      return new File([bytes as BlobPart], name);
    },
    async createWritable() {
      const chunks: Uint8Array[] = [];
      return new WritableStream<Uint8Array>({
        write(chunk) {
          if (failWrites) throw new Error("The disk is full.");
          chunks.push(chunk);
        },
        close() {
          files.set(name, new Uint8Array(chunks.flatMap((c) => [...c])));
        },
      });
    },
    async move(to: string) {
      const bytes = files.get(name);
      if (bytes) files.set(to, bytes);
      files.delete(name);
    },
  });
  const folder = {
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (!options?.create && !files.has(name))
        throw new DOMException("missing", "NotFoundError");
      return handle(name);
    },
    async removeEntry(name: string) {
      files.delete(name);
    },
    async *keys() {
      yield* [...files.keys()];
    },
  } as unknown as Folder;
  return { files, folder };
}

const ACCURATE = "onnx-community/whisper-large-v3-turbo";
const QUICK = "onnx-community/whisper-base";
const KEY = `https://huggingface.co/${ACCURATE}/resolve/main/onnx/encoder_model_q4.onnx`;

test("the file store knows which model's files come from the internet, not when a settings file is missing", async () => {
  const { folder } = pretendFolder();
  const store = new ModelStore(Promise.resolve(folder));
  await store.match(KEY.replace("onnx/encoder_model_q4.onnx", "config.json"));
  assert.equal(store.downloads(ACCURATE), false);
  await store.put(KEY, new Response(new Uint8Array([1])));
  await store.match(KEY);
  assert.equal(store.downloads(ACCURATE), false);
  // Only the quick model is new: only it downloads.
  await store.match(KEY.replace(ACCURATE, QUICK));
  assert.equal(store.downloads(QUICK), true);
  assert.equal(store.downloads(ACCURATE), false);
  await store.match(KEY.replace("encoder", "decoder"));
  assert.equal(store.downloads(ACCURATE), true);
});

test("the file store keeps a downloaded file and gives it back with its size", async () => {
  const { files, folder } = pretendFolder();
  const store = new ModelStore(Promise.resolve(folder));
  assert.equal(await store.match(KEY), undefined);
  await store.put(KEY, new Response(new Uint8Array([1, 2, 3, 4])));
  assert.deepEqual([...files.keys()], [encodeURIComponent(KEY)]);
  const kept = await store.match(KEY);
  assert.ok(kept);
  assert.equal(kept.headers.get("content-length"), "4");
  assert.deepEqual([...new Uint8Array(await kept.arrayBuffer())], [1, 2, 3, 4]);
});

test("an interrupted write is never taken for a finished file", async () => {
  const { files, folder } = pretendFolder(true);
  const store = new ModelStore(Promise.resolve(folder));
  await store.put(KEY, new Response(new Uint8Array([1, 2, 3])));
  assert.equal(files.size, 0);
  assert.equal(await store.match(KEY), undefined);
  await store.put(KEY, new Response(null));
  assert.equal(files.size, 0);
});

test("the file store removes the kept files the models no longer use", async () => {
  const { files, folder } = pretendFolder();
  const earlier = new ModelStore(Promise.resolve(folder));
  const lighter = KEY.replace("_q4.onnx", "_q4f16.onnx");
  await earlier.put(KEY, new Response(new Uint8Array([1])));
  await earlier.put(lighter, new Response(new Uint8Array([2])));
  const store = new ModelStore(Promise.resolve(folder));
  await store.match(lighter);
  await store.keepOnlyUsed();
  assert.deepEqual([...files.keys()], [encodeURIComponent(lighter)]);
});
