import { FolderSearch, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import type { Door } from "./draft";

// The first page: start something new, or bring code that exists.
export function Welcome({
  onChoose,
}: Readonly<{ onChoose: (door: Door) => void }>) {
  return (
    <section className="grid gap-8 py-6">
      <header className="grid gap-2 text-center">
        <h1 className="text-3xl font-semibold">Set up your software factory</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          The factory plans, builds and checks your software with you. It keeps
          its own files on this computer, and works on your code in copies of
          its own, so nothing changes without you.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <DoorCard
          icon={<Sparkles aria-hidden />}
          title="Start something new"
          text="Describe your company, pick the kinds of product you want, and the factory makes them for you with each framework's own starter."
          onClick={() => {
            onChoose("new");
          }}
        />
        <DoorCard
          icon={<FolderSearch aria-hidden />}
          title="Bring existing code"
          text="Point the factory at your code. It looks for your products and the commands they already have, changes nothing, and asks you to confirm what it found."
          onClick={() => {
            onChoose("existing");
          }}
        />
      </div>
    </section>
  );
}

function DoorCard({
  icon,
  title,
  text,
  onClick,
}: Readonly<{
  icon: ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid gap-3 rounded-xl border bg-card p-6 text-left shadow-xs transition hover:border-primary hover:shadow-[0_0_0_4px_var(--glow)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground [&_svg]:size-5">
        {icon}
      </span>
      <span className="text-lg font-semibold">{title}</span>
      <span className="text-muted-foreground">{text}</span>
    </button>
  );
}
