// Where the browser keeps the speech model's files after the first download:
// its private file store for this site (OPFS), on this computer. The
// browser's usual download cache can refuse files as big as the model's
// (about 430 MB), so the model would be downloaded again on every Talk. A
// file is written under a temporary name and renamed once complete, so an
// interrupted download is never taken for a finished one.

export type Folder = Pick<
  FileSystemDirectoryHandle,
  "getFileHandle" | "removeEntry"
>;

export class ModelStore {
  private folder: Promise<Folder> | null;
  // A model file (not a small settings file, some of which do not exist and
  // are asked for every time) was not kept: it comes from the internet now.
  downloading = false;

  constructor(folder?: Promise<Folder>) {
    this.folder = folder ?? null;
  }

  // The folder is opened on first use.
  private open(): Promise<Folder> {
    this.folder ??= navigator.storage
      .getDirectory()
      .then((root) =>
        root.getDirectoryHandle("speech-model", { create: true }),
      );
    return this.folder;
  }

  async match(key: string): Promise<Response | undefined> {
    try {
      const file = await (
        await (await this.open()).getFileHandle(name(key))
      ).getFile();
      return new Response(file, {
        headers: { "content-length": String(file.size) },
      });
    } catch {
      if (key.includes("/onnx/")) this.downloading = true;
      return undefined;
    }
  }

  async put(key: string, response: Response): Promise<void> {
    const folder = await this.open();
    const part = `${name(key)}.part`;
    try {
      const handle = await folder.getFileHandle(part, { create: true });
      if (!response.body) throw new Error("The download has no content.");
      await response.body.pipeTo(await handle.createWritable());

      await (
        handle as FileSystemFileHandle & {
          move(name: string): Promise<void>;
        }
      ).move(name(key));
    } catch {
      // Not kept this time (for example the disk is full): the model still
      // works, and is downloaded again next time.
      await folder.removeEntry(part).catch(() => {});
    }
  }
}

function name(key: string): string {
  return encodeURIComponent(key);
}
