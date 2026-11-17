// The Overview's river (lib/river.ts): a smooth band from what was heard to
// what worked, as wide at each stage as what reached it, its colour moving
// from Discovery's to Build's to green; a glint runs down it (not with
// reduced motion). Each stage is named with its count above the band and
// leads to its page; hovering one lights it and says what it counts.

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { type RiverStage, riverPath } from "@/lib/river";
import { cn } from "@/lib/utils";

const WIDTH = 1000;
const HEIGHT = 120;

export function River({
  stages,
  headline,
}: Readonly<{ stages: RiverStage[]; headline: string }>) {
  const { t } = useTranslation("overview");
  return (
    <section
      aria-label={t("river.title")}
      className="grid gap-3 rounded-[18px] bg-card p-5 shadow-soft"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-section">{t("river.title")}</h2>
        <p className="text-note text-muted-foreground">{headline}</p>
      </header>
      <div className="relative">
        <Band stages={stages} />
        <Stages stages={stages} />
      </div>
    </section>
  );
}

function Band({ stages }: Readonly<{ stages: RiverStage[] }>) {
  const id = useId().replaceAll(":", "");
  const path = riverPath(
    stages.map((one) => one.count),
    WIDTH,
    HEIGHT,
  );
  return (
    <svg
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      preserveAspectRatio="none"
      aria-hidden
      className="mt-12 mb-6 block h-[120px] w-full overflow-visible"
    >
      <defs>
        <linearGradient id={`${id}-flow`} x1="0" x2="1" y1="0" y2="0">
          {stages.map((one, at) => (
            <stop
              key={one.label}
              offset={`${String(((at + 0.5) / stages.length) * 100)}%`}
              style={{ stopColor: `var(${one.colour})` }}
            />
          ))}
        </linearGradient>
        <linearGradient id={`${id}-glint`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.45" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-shape`}>
          <path d={path} />
        </clipPath>
      </defs>
      <path d={path} fill={`url(#${id}-flow)`} opacity="0.9" />
      <g clipPath={`url(#${id}-shape)`}>
        <rect
          width={WIDTH * 0.25}
          height={HEIGHT}
          fill={`url(#${id}-glint)`}
          className="animate-glint"
          style={{ transformBox: "view-box" }}
        />
      </g>
    </svg>
  );
}

// Each stage over the band: its count and name at the top, what it counts
// under the band while the mouse or the focus is on it.
function Stages({ stages }: Readonly<{ stages: RiverStage[] }>) {
  const [over, setOver] = useState<number | null>(null);
  return (
    <ol className="absolute inset-0 grid grid-cols-5">
      {stages.map((one, at) => {
        const show = () => {
          setOver(at);
        };
        const hide = () => {
          setOver(null);
        };
        return (
          <li key={one.label} className="grid">
            <a
              href={one.href}
              title={one.words}
              onMouseEnter={show}
              onMouseLeave={hide}
              onFocus={show}
              onBlur={hide}
              className={cn(
                "grid content-between justify-items-center rounded-xl pb-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                over === at && "bg-foreground/[0.04]",
              )}
            >
              <span className="grid justify-items-center leading-none">
                <span className="text-section tabular-nums">{one.count}</span>
                <span className="mt-1 text-tag font-medium text-foreground-2">
                  {one.label}
                </span>
              </span>
              <span
                className={cn(
                  "text-tag text-muted-foreground opacity-0 transition-opacity",
                  over === at && "opacity-100",
                )}
              >
                {one.words}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
