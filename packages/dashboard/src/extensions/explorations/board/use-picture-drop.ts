// Pictures and web addresses a person pastes (Ctrl/Cmd+V, not while typing)
// or drags onto the board become cards on it, at the pointer (or the middle
// of the view when the pointer is off the board): a picture card for a
// picture, a link card for a web address. While something is dragged over,
// the board shows where to drop it; a picture the server refuses says why for
// a few seconds.

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post } from "@/api/client";

import { addressOf } from "./mine/preview";

const SHOWN_MS = 6000;

type Client = { x: number; y: number };

export type BringIn = {
  // Where the pointer is on the board, null when it is off it.
  pointer: RefObject<Client | null>;
  // A point on the screen as a point on the board.
  flowAt: (client: Client | null) => { x: number; y: number };
  // A web address came: a link card.
  onLink: (address: string, client: Client | null) => void;
};

function read(file: File, unreadable: string): Promise<string> {
  return new Promise((done, fail) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (typeof result === "string") done(result);
      else fail(new Error(unreadable));
    };
    reader.onerror = () => {
      fail(new Error(unreadable));
    };
    reader.readAsDataURL(file);
  });
}

function imageIn(files: FileList | undefined): File | null {
  return [...(files ?? [])].find((f) => f.type.startsWith("image/")) ?? null;
}

// The first web address in what was copied or dragged.
function addressIn(data: DataTransfer | null): string | null {
  if (!data) return null;
  const list = data
    .getData("text/uri-list")
    .split(/\r?\n/)
    .find((line) => line && !line.startsWith("#"));
  return addressOf(list ?? data.getData("text/plain"));
}

const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  target.matches("input, textarea, [contenteditable]");

export function usePictureDrop(
  exploration: string,
  area: RefObject<HTMLElement | null>,
  bring: BringIn,
) {
  const [dropping, setDropping] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const words = useTranslation().t;
  // The latest of these, for the listeners below.
  const latest = useRef(bring);
  useEffect(() => {
    latest.current = bring;
  });
  const add = useCallback(
    (file: File | null, title: string, client: Client | null) => {
      if (!file) {
        setRefused(words("explore.board.onlyPicturesAndLinks"));
        return;
      }
      read(file, words("explore.board.pictureUnreadable"))
        .then((data) =>
          post<{ thing: { id: string } }>("/api/kobble/explorations/picture", {
            id: exploration,
            title,
            data,
          }),
        )
        // The picture card goes where it was dropped or pasted.
        .then(({ thing }) => {
          const at = latest.current.flowAt(client);
          return post("/api/kobble/explorations/board", {
            id: exploration,
            do: { act: "move", id: thing.id, x: at.x - 150, y: at.y - 40 },
          });
        })
        .catch((error: unknown) => {
          setRefused(messageOf(error));
        });
    },
    [exploration, words],
  );
  usePaste(add, latest, words("explore.board.pasted"));
  useDrop(area, add, latest, setDropping);
  useEffect(() => {
    if (!refused) return;
    const timer = setTimeout(() => {
      setRefused(null);
    }, SHOWN_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [refused]);
  return { dropping, refused };
}

type Add = (file: File | null, title: string, client: Client | null) => void;

function usePaste(
  add: Add,
  latest: RefObject<BringIn>,
  pasted: string,
) {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (typingIn(event.target)) return;
      const bring = latest.current;
      const client = bring.pointer.current;
      const file = imageIn(event.clipboardData?.files);
      if (file) {
        event.preventDefault();
        add(file, pasted, client);
        return;
      }
      const address = addressIn(event.clipboardData);
      if (address) {
        event.preventDefault();
        bring.onLink(address, client);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
    };
  }, [add, latest, pasted]);
}

function useDrop(
  area: RefObject<HTMLElement | null>,
  add: Add,
  latest: RefObject<BringIn>,
  setDropping: (dropping: boolean) => void,
) {
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    // Files, or a link dragged from a browser.
    const brings = (event: DragEvent) =>
      ["Files", "text/uri-list", "text/plain"].some((type) =>
        event.dataTransfer?.types.includes(type),
      );
    const over = (event: DragEvent) => {
      if (!brings(event)) return;
      event.preventDefault();
      setDropping(true);
    };
    const leave = () => {
      setDropping(false);
    };
    const drop = (event: DragEvent) => {
      setDropping(false);
      if (!brings(event)) return;
      const client = { x: event.clientX, y: event.clientY };
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
        const file = imageIn(event.dataTransfer.files);
        add(file, file?.name.replace(/\.\w+$/, "") || "Picture", client);
        return;
      }
      const address = addressIn(event.dataTransfer);
      if (address) {
        event.preventDefault();
        latest.current.onLink(address, client);
      }
    };
    element.addEventListener("dragover", over);
    element.addEventListener("dragleave", leave);
    element.addEventListener("drop", drop);
    return () => {
      element.removeEventListener("dragover", over);
      element.removeEventListener("dragleave", leave);
      element.removeEventListener("drop", drop);
    };
  }, [area, add, latest, setDropping]);
}
