// The files attached to the message being written: each sent to the
// factory as soon as it is chosen (the factory keeps it, out of git), shown
// with a small picture while it goes, and taken back with its ×. Pictures,
// PDFs and text files, five at most, 7 MB each.

import { useState } from "react";

import { messageOf, post } from "@/api";
import { t } from "@/i18n/i18n";
import type { Sent } from "@/lib/chat-view";

export const ACCEPTED =
  "image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json";
const MOST = 5;
const MOST_BYTES = 7 * 1024 * 1024;

export type Attaching = {
  key: string;
  name: string;
  preview: string | null;
  // Once the factory has it.
  sent: Sent | null;
  problem: string | null;
};

// A file's content as base64, as the factory takes it.
async function base64Of(file: File): Promise<string> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(new Error(t("chat:files.unreadable")));
    };
    reader.readAsDataURL(file);
  });
  return url.slice(url.indexOf(",") + 1);
}

// Why a file cannot be attached, or null.
function refusedOf(file: File): string | null {
  // Some systems give a Markdown file no type.
  const type = file.type || (file.name.endsWith(".md") ? "text/markdown" : "");
  if (!ACCEPTED.split(",").includes(type)) return t("chat:files.wrongType");
  return file.size > MOST_BYTES ? t("chat:files.tooLarge") : null;
}

export function useAttachments() {
  const [files, setFiles] = useState<Attaching[]>([]);
  const change = (key: string, more: Partial<Attaching>) => {
    setFiles((all) =>
      all.map((one) => (one.key === key ? { ...one, ...more } : one)),
    );
  };
  const attachOne = async (file: File) => {
    const key = crypto.randomUUID();
    const preview = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;
    const problem = refusedOf(file);
    setFiles((all) => [
      ...all,
      { key, name: file.name, preview, sent: null, problem },
    ]);
    if (problem) return;
    try {
      const { file: stored } = await post<{ file: Omit<Sent, "preview"> }>(
        "/api/chat/attachments",
        {
          name: file.name,
          type: file.type || "text/markdown",
          data: await base64Of(file),
        },
      );
      change(key, { sent: { ...stored, preview } });
    } catch (error) {
      change(key, { problem: messageOf(error) });
    }
  };
  const attach = (chosen: File[]) => {
    for (const file of chosen.slice(0, Math.max(0, MOST - files.length)))
      void attachOne(file);
  };
  const remove = (key: string) => {
    setFiles((all) => all.filter((one) => one.key !== key));
  };
  const sent = files.flatMap((one) => (one.sent ? [one.sent] : []));
  const going = files.some((one) => !one.sent && !one.problem);
  const clear = () => {
    setFiles([]);
  };
  return { files, attach, remove, sent, going, clear };
}
