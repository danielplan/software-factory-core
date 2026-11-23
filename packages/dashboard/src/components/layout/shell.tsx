// The frame around every page of Kobble, while it is set up and after: the
// white sidebar, and beside it the page on the grey ground, at most 1120px
// wide, its buttons in its own head (page-head.tsx), and Sprocket's bar
// floating at the bottom. What fills them is the app's (app/factory-shell.tsx)
// or setup's. A page that fills the whole window (an exploration's canvas)
// has neither sidebar nor bar: its own bar leads back.

import type { ReactNode } from "react";

export function Shell({
  sidebar,
  sprocket,
  shown,
  fill = false,
  children,
}: Readonly<{
  sidebar: ReactNode;
  // Sprocket's bar, and the window it grows into.
  sprocket: ReactNode;
  // What is shown, so the page rises in again when it changes.
  shown: string;
  fill?: boolean;
  children: ReactNode;
}>) {
  if (fill)
    return <main className="min-h-dvh min-w-0 bg-ground">{children}</main>;
  return (
    <div className="flex min-h-dvh bg-ground max-md:pt-14 md:pl-56">
      {sidebar}
      <main className="min-w-0 flex-1">
        <div
          key={shown}
          className="mx-auto grid max-w-[1120px] content-start gap-4 px-4 pt-6 pb-28 motion-safe:animate-rise sm:px-10 sm:pt-[34px]"
        >
          {children}
        </div>
      </main>
      {sprocket}
    </div>
  );
}
