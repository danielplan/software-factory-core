// A persona's little kobold (lib/monster.ts chooses which): the kobold's
// own body, ears and face (kobold-parts.tsx), so they read as one family,
// with a hat of its own (a close variant of the kobold's wizard hat, in its
// own colour) and maybe a scarf, a bow or glasses. The same persona is the
// same one everywhere. It reads from 24px (a chip) to 64px (a page).

import { useId } from "react";

import { type Monster, monsterOf } from "@/lib/monster";

import {
  type HatTones,
  KoboldBody,
  KoboldEars,
  KoboldFace,
  KoboldPaints,
} from "./kobold-parts";

// Each hat colour: light, middle, shade (the band and tip take the shade).
const HATS: Record<Monster["hue"], HatTones> = {
  cyan: ["#5fd3f5", "#1fa9d6", "#11789c"],
  amber: ["#ffc95c", "#f0a12a", "#b9700d"],
  violet: ["#b991ff", "#8a5cf0", "#5d34b8"],
  green: ["#5fdca1", "#25a96d", "#147a4c"],
  rose: ["#ff8fae", "#ec4f7d", "#b52a55"],
  coral: ["#ffa07a", "#f06a3a", "#b9441b"],
  teal: ["#4fd8c8", "#17a596", "#0c7066"],
};

export function PersonaMonster({
  seed,
  tint = null,
  size = 36,
  label,
}: Readonly<{
  // The persona's name (or id): the same seed, the same little kobold.
  seed: string;
  // The persona's tint index, so personas side by side differ in colour.
  tint?: number | null;
  size?: number;
  // What a screen reader says; without one it is only decoration.
  label?: string;
}>) {
  const id = useId().replaceAll(":", "");
  const monster = monsterOf(seed, tint);
  const tones = HATS[monster.hue];
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className="flex-none overflow-visible"
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      <KoboldPaints id={id} hat={tones} />
      <ellipse cx="100" cy="186" rx="46" ry="8" fill={`url(#${id}-shadow)`} />
      <KoboldEars id={id} />
      <KoboldBody id={id} />
      <KoboldFace />
      <Wears kind={monster.wears} colour={tones[1]} />
      <Hat kind={monster.hat} id={id} shade={tones[2]} light={tones[0]} />
    </svg>
  );
}

const TALL = "M56 96 Q66 54 100 34 Q130 50 144 96 Z";
const STAR =
  "M100 60 L104 69 L114 70 L106 76 L109 86 L100 80 L91 86 L94 76 L86 70 L96 69 Z";

// The hat: the kobold's cone and band, with a tip, a bobble, a star or a
// floppy end; one shape is shorter.
function Hat({
  kind,
  id,
  shade,
  light,
}: Readonly<{
  kind: Monster["hat"];
  id: string;
  shade: string;
  light: string;
}>) {
  const fill = `url(#${id}-hat)`;
  const band = <ellipse cx="100" cy="95" rx="47" ry="9" fill={shade} />;
  switch (kind) {
    case "short":
      return (
        <g>
          <path d="M58 96 Q70 66 100 54 Q128 64 142 96 Z" fill={fill} />
          {band}
          <path d="M98 56 Q116 42 134 50 Q120 53 112 64 Z" fill={shade} />
        </g>
      );
    case "bobble":
      return (
        <g>
          <path d={TALL} fill={fill} />
          {band}
          <circle cx="100" cy="32" r="11" fill={light} />
          <circle cx="96" cy="28" r="3.5" fill="#ffffff" opacity="0.7" />
        </g>
      );
    case "floppy":
      return (
        <g>
          <path d="M56 96 Q64 58 96 44 Q128 48 144 96 Z" fill={fill} />
          {band}
          <path d="M94 46 Q130 30 152 60 Q132 52 116 58 Z" fill={shade} />
        </g>
      );
    case "tall":
    case "star":
      return (
        <g>
          <path d={TALL} fill={fill} />
          {band}
          <path d="M98 36 Q122 16 150 28 Q132 31 118 46 Z" fill={shade} />
          {kind === "star" && <path d={STAR} fill="#fff6c2" />}
        </g>
      );
  }
}

// What it wears below its face, in its hat's colour.
function Wears({
  kind,
  colour,
}: Readonly<{ kind: Monster["wears"]; colour: string }>) {
  switch (kind) {
    case "scarf":
      return (
        <g fill={colour}>
          <path d="M58 156 Q100 176 142 156 L140 168 Q100 188 60 168 Z" />
          <path d="M120 170 L132 194 L120 196 L110 174 Z" />
        </g>
      );
    case "bow":
      return (
        <g fill={colour}>
          <path d="M100 166 L82 156 L82 178 Z" />
          <path d="M100 166 L118 156 L118 178 Z" />
          <circle cx="100" cy="166" r="5" />
        </g>
      );
    case "glasses":
      return (
        <g fill="#ffffff" fillOpacity="0.18" stroke="#1b1f3b" strokeWidth="3">
          <circle cx="86" cy="130" r="13" />
          <circle cx="114" cy="130" r="13" />
          <path d="M99 130 H 101" fill="none" />
        </g>
      );
    case "none":
      return null;
  }
}
