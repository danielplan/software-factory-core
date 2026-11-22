// Asks the support kobold from anywhere on a page: its conversation opens
// with the person's words already sent (New persona, New exploration).

const ASK = "kobble:ask-support";

export function askSupport(text: string): void {
  window.dispatchEvent(new CustomEvent(ASK, { detail: text }));
}

// The support bar listens: it opens and sends the words.
export function onAskSupport(listener: (text: string) => void): () => void {
  const heard = (event: Event) => {
    if (event instanceof CustomEvent && typeof event.detail === "string")
      listener(event.detail);
  };
  window.addEventListener(ASK, heard);
  return () => {
    window.removeEventListener(ASK, heard);
  };
}
