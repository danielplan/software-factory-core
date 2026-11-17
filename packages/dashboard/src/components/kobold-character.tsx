// The kobold as a little 3D-looking cartoon, drawn in layers so each part
// can move on its own (kobold-character.css): its shadow, its round body,
// its face (eyes that blink, cheeks) and its blue hat,
// whose tip moves a beat after the rest. Moods: idle (breathing, blinking),
// calm (only blinking, for a small picture beside a message),
// thinking (head tilted, eyes up, a thought bubble beside it), talking
// (a little bounce) and running (in place: feet, dust, speed lines). With `arrive` it drops in first. It is a picture of the
// kobold everywhere it stands for it; decorative unless given a label.

import "./kobold-character.css";

import { useId } from "react";

import { cn } from "@/lib/utils";

import {
  BLUE_HAT,
  KoboldBody,
  KoboldFace,
  KoboldHat,
  KoboldPaints,
} from "./kobold-parts";

export type KoboldMood = "idle" | "calm" | "thinking" | "talking" | "running";

// When its moods start: after it has arrived.
const ARRIVED: Record<string, string> = {
  false: "0s",
  true: "1s",
};

export function KoboldCharacter({
  size = 132,
  mood = "idle",
  arrive = false,
  label,
  className,
}: Readonly<{
  size?: number;
  mood?: KoboldMood;
  // Dropping in first.
  arrive?: boolean;
  // What a screen reader says; without one it is only decoration.
  label?: string;
  className?: string;
}>) {
  const after = ARRIVED[String(arrive)] ?? "0s";
  const drawing = (
    <Drawing
      size={size}
      mood={mood}
      arrive={arrive}
      after={after}
      label={label}
    />
  );
  return (
    <span
      className={cn("relative inline-block flex-none", className)}
      style={{ width: size, height: size }}
    >
      {drawing}
      {mood === "thinking" && (
        <ThoughtBubble size={size} start={Number.parseFloat(after)} />
      )}
    </span>
  );
}

function Drawing({
  size,
  mood,
  arrive,
  after,
  label,
}: Readonly<{
  size: number;
  mood: KoboldMood;
  arrive: boolean;
  after: string;
  label?: string;
}>) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className="kc block overflow-visible"
      data-mood={mood}
      data-arrive={String(arrive)}
      style={{ ["--kc-after" as string]: after }}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      <KoboldPaints id={id} hat={BLUE_HAT} />
      {mood === "running" && <Trail />}
      <g className="k-shadow">
        <ellipse cx="100" cy="186" rx="46" ry="8" fill={`url(#${id}-shadow)`} />
      </g>
      <g className="k-whole">
        <g className="k-pose">
          {mood === "running" && <Feet id={id} />}
          <g className="k-breathe">
            <KoboldBody id={id} />
            <KoboldFace />
            <KoboldHat id={id} />
          </g>
        </g>
      </g>
    </svg>
  );
}

// Running: two small round feet under it, stepping in turn.
function Feet({ id }: Readonly<{ id: string }>) {
  const fill = `url(#${id}-ear)`;
  return (
    <>
      <g className="k-foot-l">
        <ellipse cx="84" cy="176" rx="13" ry="8" fill={fill} />
      </g>
      <g className="k-foot-r">
        <ellipse cx="116" cy="176" rx="13" ry="8" fill={fill} />
      </g>
    </>
  );
}

// Running: dust puffing up behind it, and speed lines.
function Trail() {
  return (
    <g className="k-trail" fill="#c7cbf2">
      {[0, 1, 2].map((at) => (
        <circle
          key={at}
          className="k-dust"
          cx={54 - at * 10}
          cy={178 - at * 3}
          r={7 - at * 1.5}
          style={{ animationDelay: `${String(at * 0.14)}s` }}
        />
      ))}
      {[0, 1, 2].map((at) => (
        <rect
          key={`line-${String(at)}`}
          className="k-speed"
          x="10"
          y={108 + at * 18}
          width={26 - at * 6}
          height="3.5"
          rx="1.75"
          style={{ animationDelay: `${String(at * 0.12)}s` }}
        />
      ))}
    </g>
  );
}

// Thinking: two small circles rising to a cloud with three dots in it, at
// the kobold's top right.
function ThoughtBubble({
  size,
  start,
}: Readonly<{ size: number; start: number }>) {
  const unit = size / 132;
  const delay = (seconds: number) => ({
    animationDelay: `${String(start + seconds)}s`,
  });
  return (
    <span aria-hidden className="kc-bubble absolute inset-0">
      <span
        className="absolute rounded-full border border-tint-line bg-tint"
        style={{
          left: "82%",
          top: "34%",
          width: 8 * unit,
          height: 8 * unit,
          ...delay(0),
        }}
      />
      <span
        className="absolute rounded-full border border-tint-line bg-tint"
        style={{
          left: "92%",
          top: "20%",
          width: 12 * unit,
          height: 12 * unit,
          ...delay(0.15),
        }}
      />
      <span
        className="absolute flex items-center gap-1.5 rounded-full border border-tint-line bg-tint px-3.5 py-2.5 shadow-soft"
        style={{ left: "100%", top: "-6%", ...delay(0.3) }}
      >
        {[0, 1, 2].map((at) => (
          <span
            key={at}
            className="kc-dot size-2 rounded-full bg-primary/60"
            style={delay(0.45 + at * 0.2)}
          />
        ))}
      </span>
    </span>
  );
}
