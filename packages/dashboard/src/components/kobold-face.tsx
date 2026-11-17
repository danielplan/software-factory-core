// The kobold faces: Kobble's own kobold (light blue, with its blue floppy
// cap) and one per persona, each a kobold with a hat and a colour (a
// persona's face comes from its file, or from its id: core's face.ts).
// Drawn in one 44×44 box: long ears, a round head, two eyes with a
// highlight, and the hat on top.

import type { Face, PersonaColor, PersonaHat } from "@/api";
import { cn } from "@/lib/utils";

const INK = "#1b2236";

// Background, skin and hat colours of each persona colour.
export const FACE_COLORS: Record<
  PersonaColor,
  { bg: string; skin: string; fg: string }
> = {
  pink: { bg: "#fdeef3", skin: "#f5c4d6", fg: "#b8325f" },
  amber: { bg: "#fdf4e6", skin: "#f0d3a3", fg: "#99560f" },
  blue: { bg: "#eef2ff", skin: "#c6d3ff", fg: "#2948bc" },
  teal: { bg: "#e8f7f2", skin: "#b3e3d3", fg: "#126b56" },
  violet: { bg: "#f3effd", skin: "#d8cbf6", fg: "#5b3bb5" },
  green: { bg: "#eef7e6", skin: "#cbe6ad", fg: "#3f6b12" },
  slate: { bg: "#eef1f5", skin: "#cfd7e2", fg: "#3b4a5e" },
};

function Eye({ x }: Readonly<{ x: number }>) {
  return (
    <>
      <circle cx={x} cy={29} r={2.5} fill={INK} />
      <circle cx={x + 0.875} cy={28} r={0.95} fill="#fff" />
    </>
  );
}

function Head({ skin }: Readonly<{ skin: string }>) {
  return (
    <>
      <path d="M12 22 Q2.5 21 1 35 Q8.5 34.5 13.5 29.5 Z" fill={skin} />
      <path d="M32 22 Q41.5 21 43 35 Q35.5 34.5 30.5 29.5 Z" fill={skin} />
      <path
        d="M10 28 Q10 17 22 17 Q34 17 34 28 Q34 39 22 39 Q10 39 10 28 Z"
        fill={skin}
      />
      <Eye x={17.3} />
      <Eye x={26.7} />
    </>
  );
}

function Hat({
  hat,
  color,
}: Readonly<{ hat: PersonaHat | "flop"; color: string }>) {
  switch (hat) {
    case "phones":
      return (
        <>
          <path
            d="M11.5 29 Q11.5 13 22 13 Q32.5 13 32.5 29"
            fill="none"
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <rect x={8.5} y={25} width={6} height={9} rx={3} fill={color} />
          <rect x={29.5} y={25} width={6} height={9} rx={3} fill={color} />
        </>
      );
    case "toque":
      return (
        <path
          d="M14 20.5 Q10.5 12 16.5 12.5 Q18 6.5 22 8.5 Q26 6.5 27.5 12.5 Q33.5 12 30 20.5 Z"
          fill="#fff"
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      );
    case "cap":
      return (
        <path
          d="M11.5 22 Q11.5 12 22 12 Q31.5 12 32.5 21 L39 23 L11.5 23 Z"
          fill={color}
        />
      );
    case "beret":
      return (
        <>
          <ellipse cx={21} cy={18.5} rx={12.5} ry={4.4} fill={color} />
          <circle cx={21} cy={13.4} r={1.7} fill={color} />
        </>
      );
    case "flop":
      return (
        <path
          d="M12 21 Q16 9 24 5 Q31 2 35 9 Q36 12 33.5 11.5 Q31.5 7.5 28 10 Q31 15 32 21 Z"
          fill={color}
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      );
  }
}

// A persona's kobold on its coloured tile.
export function PersonaFace({
  face,
  size = 36,
  className,
}: Readonly<{ face: Face; size?: number; className?: string }>) {
  const colors = FACE_COLORS[face.color];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden
      className={cn("flex-none overflow-visible", className)}
    >
      <rect width={44} height={44} rx={12} fill={colors.bg} />
      <Head skin={colors.skin} />
      <Hat hat={face.hat} color={colors.fg} />
    </svg>
  );
}

// Someone no persona stands for: an empty tile.
export function NoFace({ size = 36 }: Readonly<{ size?: number }>) {
  return (
    <span
      aria-hidden
      className="flex-none bg-surface-2"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
    />
  );
}

// Kobble's own kobold, with its floppy cap.
export function KoboldHead({
  size = 28,
  className,
}: Readonly<{ size?: number; className?: string }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden
      className={cn("flex-none overflow-visible", className)}
    >
      <Head skin="#c6d3ff" />
      <Hat hat="flop" color="#3156d8" />
    </svg>
  );
}
