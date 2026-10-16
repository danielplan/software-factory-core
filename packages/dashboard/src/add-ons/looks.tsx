import { Code, Puzzle } from "lucide-react";
import type { ReactNode } from "react";
import {
  type SimpleIcon,
  siExpo,
  siGithub,
  siJira,
  siNestjs,
  siReact,
} from "simple-icons";

import { cn } from "@/lib/utils";

// How an add-on or a kit looks in the store and wherever it is chosen: its
// logo and its colour, by id; anything else a puzzle piece. A logo in a dark
// colour takes the text's colour, so it shows in both themes.
type Look = { icon: ReactNode; colour: string };

const INK = "var(--foreground)";

const LOOKS: Record<string, Look | undefined> = {
  github: { icon: <Logo icon={siGithub} />, colour: INK },
  jira: { icon: <Logo icon={siJira} />, colour: "#2684ff" },
  "expo-app": { icon: <Logo icon={siExpo} />, colour: INK },
  "react-web-app": { icon: <Logo icon={siReact} />, colour: "#149eca" },
  "nestjs-backend": { icon: <Logo icon={siNestjs} />, colour: "#e0234e" },
  "other-code": { icon: <Code aria-hidden />, colour: "#64748b" },
};

const OTHER: Look = { icon: <Puzzle aria-hidden />, colour: "#8b5cf6" };

export function lookOf(id: string): Look {
  return LOOKS[id] ?? OTHER;
}

// Its logo on a tile tinted with its colour.
export function IconTile({
  id,
  big = false,
}: Readonly<{ id: string; big?: boolean }>) {
  const { icon, colour } = lookOf(id);
  return (
    <span
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center",
        big
          ? "size-12 rounded-2xl [&_svg]:size-6"
          : "size-8 rounded-lg [&_svg]:size-4",
      )}
      style={{
        color: colour,
        background: `color-mix(in oklab, ${colour} 12%, transparent)`,
      }}
    >
      {icon}
    </span>
  );
}

function Logo({ icon }: Readonly<{ icon: SimpleIcon }>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={icon.path} />
    </svg>
  );
}
