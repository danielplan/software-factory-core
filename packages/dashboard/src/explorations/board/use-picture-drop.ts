// Pictures a person pastes (Ctrl/Cmd+V) or drags onto the board become
// pictures on it. While a file is dragged over, the board shows where to
// drop it; a picture the server refuses says why for a few seconds.

import { type RefObject, useCallback, useEffect, useState } from "react";

import { messageOf, post } from "@/api";

const SHOWN_MS = 6000;

function read(file: File): Promise<string> {
  return new Promise((done, fail) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (typeof result === "string") done(result);
      else fail(new Error("The picture could not be read."));
    };
    reader.onerror = () => {
      fail(new Error("The picture could not be read."));
    };
    reader.readAsDataURL(file);
  });
}

function imageIn(files: FileList | undefined): File | null {
  return [...(files ?? [])].find((f) => f.type.startsWith("image/")) ?? null;
}

export function usePictureDrop(
  exploration: string,
  area: RefObject<HTMLElement | null>,
) {
  const [dropping, setDropping] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const add = useCallback(
    (file: File | null, title: string) => {
      if (!file) {
        setRefused("Only pictures can go on the board.");
        return;
      }
      read(file)
        .then((data) =>
          post("/api/kobble/explorations/picture", {
            id: exploration,
            title,
            data,
          }),
        )
        .catch((error: unknown) => {
          setRefused(messageOf(error));
        });
    },
    [exploration],
  );
  usePaste(add);
  useDrop(area, add, setDropping);
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

type Add = (file: File | null, title: string) => void;

function usePaste(add: Add) {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = imageIn(event.clipboardData?.files);
      const target = event.target;
      const typing =
        target instanceof HTMLElement && target.matches("input, textarea");
      if (!file || typing) return;
      event.preventDefault();
      add(file, "Pasted picture");
    };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
    };
  }, [add]);
}

function useDrop(
  area: RefObject<HTMLElement | null>,
  add: Add,
  setDropping: (dropping: boolean) => void,
) {
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const over = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      setDropping(true);
    };
    const leave = () => {
      setDropping(false);
    };
    const drop = (event: DragEvent) => {
      setDropping(false);
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      const file = imageIn(event.dataTransfer.files);
      add(file, file?.name.replace(/\.\w+$/, "") || "Picture");
    };
    element.addEventListener("dragover", over);
    element.addEventListener("dragleave", leave);
    element.addEventListener("drop", drop);
    return () => {
      element.removeEventListener("dragover", over);
      element.removeEventListener("dragleave", leave);
      element.removeEventListener("drop", drop);
    };
  }, [area, add, setDropping]);
}
