// Pictures and web addresses a person pastes (Ctrl/Cmd+V, not while typing)
// or drags onto the board become cards on it, at the pointer (or the middle
// of the view when the pointer is off the board): a picture card for a
// picture, a link card for a web address (mine/came.ts). While something is
// dragged over, the board shows where to drop it; what the server refuses
// says why for a few seconds.

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post } from "@/api/client";

import { type Came, cameAs } from "./mine/came";

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
      if (typeof reader.result === "string") done(reader.result);
      else fail(new Error(unreadable));
    };
    reader.onerror = () => {
      fail(new Error(unreadable));
    };
    reader.readAsDataURL(file);
  });
}

// A picture's name for its card; a picture copied from a page is called
// "image": it is a pasted one.
function titleOf(file: File, pasted: string): string {
  const name = file.name.replace(/\.\w+$/, "");
  return name && name !== "image" ? name : pasted;
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
  const addPicture = useCallback(
    (file: File, client: Client | null) => {
      const title = titleOf(file, words("explore.board.pasted"));
      read(file, words("explore.board.pictureUnreadable"))
        .then((data) => {
          // The picture card goes where it was dropped or pasted.
          const at = latest.current.flowAt(client);
          return post("/api/kobble/explorations/picture", {
            id: exploration,
            title,
            data,
            x: at.x - 150,
            y: at.y - 40,
          });
        })
        .catch((error: unknown) => {
          setRefused(messageOf(error));
        });
    },
    [exploration, words],
  );
  // What came, at the place it came to; nothing that fits is said.
  const take = useCallback(
    (came: Came | null, client: Client | null) => {
      if (!came) setRefused(words("explore.board.onlyPicturesAndLinks"));
      else if ("picture" in came) addPicture(came.picture, client);
      else latest.current.onLink(came.link, client);
    },
    [addPicture, words],
  );
  usePaste(take, latest);
  useDrop(area, take, setDropping);
  useEffect(() => {
    if (!refused) return;
    const timer = setTimeout(() => {
      setRefused(null);
    }, SHOWN_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [refused]);
  return {
    dropping,
    refused,
    // A picture chosen with the toolbar's picker: in the middle of the view.
    choose: (file: File) => {
      addPicture(file, null);
    },
  };
}

type Take = (came: Came | null, client: Client | null) => void;

function usePaste(take: Take, latest: RefObject<BringIn>) {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (typingIn(event.target)) return;
      const came = cameAs(event.clipboardData);
      // Something else pasted (nothing that is a picture or an address) is
      // left alone.
      if (!came) return;
      event.preventDefault();
      take(came, latest.current.pointer.current);
    };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
    };
  }, [take, latest]);
}

function useDrop(
  area: RefObject<HTMLElement | null>,
  take: Take,
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
      event.preventDefault();
      take(cameAs(event.dataTransfer), { x: event.clientX, y: event.clientY });
    };
    element.addEventListener("dragover", over);
    element.addEventListener("dragleave", leave);
    element.addEventListener("drop", drop);
    return () => {
      element.removeEventListener("dragover", over);
      element.removeEventListener("dragleave", leave);
      element.removeEventListener("drop", drop);
    };
  }, [area, take, setDropping]);
}
