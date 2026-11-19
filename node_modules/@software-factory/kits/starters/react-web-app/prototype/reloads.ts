// The factory asks the page to load again after the prototype maker's change
// (words in the translation files do not refresh by themselves):
// { type: "factory-reload" } from the frame's parent on this computer. The
// page reloads in place, on the screen it shows.
const thisComputer = new Set(["localhost", "127.0.0.1"]);

export function followReloads(): void {
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== window.parent) return;
    if (!URL.canParse(event.origin)) return;
    if (!thisComputer.has(new URL(event.origin).hostname)) return;
    const data = event.data as { type?: unknown } | null;
    if (data?.type === "factory-reload") window.location.reload();
  });
}
