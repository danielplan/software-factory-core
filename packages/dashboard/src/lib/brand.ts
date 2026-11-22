// The company's own look beyond colours, from its theme (factory/theme.css,
// written from the app's code when Kobble is set up):
//   --logo: url("/api/theme/file?path=<the app's logo>");  its mark, shown
//     at the top of the sidebar and as the tab's icon instead of the kobold
//   --wordmark: <font>;  the font its name is written in
//   --wordmark-case: uppercase;  --wordmark-weight: 400;  how it is written
//   --sidebar-logo: none;  the sidebar without the mark (its name only)
// And the kobold's own name.

import { useEffect, useState, useSyncExternalStore } from "react";

// Kobble's own kobold.
export const KOBOLD_NAME = "Sprocket";

// The names the company gave (factory.json's brand), once the factory's
// state is known (app/app.tsx).
type Names = { factory: string | null; own: string | null; kobold: string };
let names: Names = { factory: null, own: null, kobold: KOBOLD_NAME };
const listeners = new Set<() => void>();

export function setBrand(
  company: string | null,
  brand: { factory?: string; kobold?: string } | undefined,
): void {
  const own = brand?.factory ?? null;
  const next: Names = {
    // Kobble's own project is called Kobble: not "Kobble · Kobble".
    factory:
      own ?? (company && company !== "Kobble" ? `${company} · Kobble` : null),
    own,
    kobold: brand?.kobold ?? KOBOLD_NAME,
  };
  if (JSON.stringify(next) === JSON.stringify(names)) return;
  names = next;
  document.title = names.factory ?? "Kobble";
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The factory's own name, when the company gave it one ("Acme Factory").
export function useFactoryName(): string | null {
  return useSyncExternalStore(subscribe, () => names.own);
}

// The kobold's name: the company's, or Sprocket.
export function useKoboldName(): string {
  return useSyncExternalStore(subscribe, () => names.kobold);
}

// Said when the company's theme has loaded (main.tsx).
export const THEME_LOADED = "kobble:theme-loaded";

// The logo's address in a --logo value (url("…")), or null without one.
export function logoOf(value: string): string | null {
  const text = value.trim();
  if (!text.startsWith("url(") || !text.endsWith(")")) return null;
  const inside = text.slice(4, -1).trim();
  const quote = inside.at(0);
  const bare =
    (quote === '"' || quote === "'") && inside.endsWith(quote)
      ? inside.slice(1, -1)
      : inside;
  return bare === "" ? null : bare;
}

function pageLogo(): string | null {
  return logoOf(
    getComputedStyle(document.documentElement).getPropertyValue("--logo"),
  );
}

function sidebarLogo(): string | null {
  const hidden = getComputedStyle(document.documentElement)
    .getPropertyValue("--sidebar-logo")
    .trim();
  return hidden === "none" ? "none" : pageLogo();
}

// The mark at the top of the sidebar, once the theme has loaded: the
// company's logo, "none" when its theme leaves the mark out there, or null
// for Kobble's own look (the kobold).
export function useLogo(): string | null {
  const [logo, setLogo] = useState(sidebarLogo);
  useEffect(() => {
    const follow = () => {
      setLogo(sidebarLogo());
    };
    follow();
    window.addEventListener(THEME_LOADED, follow);
    return () => {
      window.removeEventListener(THEME_LOADED, follow);
    };
  }, []);
  return logo;
}

// The tab's icon: the company's logo when its theme names one.
export function followLogo(): void {
  const logo = pageLogo();
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!logo || !icon) return;
  icon.type = logo.endsWith(".svg") ? "image/svg+xml" : "";
  icon.href = logo;
}
