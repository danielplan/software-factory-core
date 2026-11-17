// The opening of the dashboard, so loading is something nice to watch:
// soft clouds on three depths drifting from right to left, each fading in
// and out as it passes, and in the middle the kobold on a magic carpet,
// flying in from the left and floating while the factory opens. It stays at
// least a moment (never a flash); once `ready`, the kobold flies off to the
// right, the screen fades, and `onDone` is called when the dashboard shows.
// With reduced motion it is a still picture that fades. Drawn here, no
// pictures loaded.

import "./splash.css";

import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { KoboldCharacter } from "@/components/kobold-character";
import { openingTimes } from "@/lib/splash";

// Three depths: far clouds are small, faint and slow; near ones large and
// quick. Each starts part way along its path, so the sky is full at once.
const LAYERS = [
  { depth: "far", count: 4, width: 9, tops: [12, 30, 62, 78], seconds: 16 },
  { depth: "mid", count: 3, width: 15, tops: [20, 55, 74], seconds: 10 },
  { depth: "near", count: 2, width: 24, tops: [8, 70], seconds: 6.5 },
] as const;

export function Splash({
  ready,
  onDone,
}: Readonly<{ ready: boolean; onDone: () => void }>) {
  const { t } = useTranslation("setup");
  const [startedAt] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const { wait, part } = openingTimes(Date.now() - startedAt, reduced);
    const opening = window.setTimeout(() => {
      setOpen(true);
    }, wait);
    const done = window.setTimeout(onDone, wait + part);
    return () => {
      window.clearTimeout(opening);
      window.clearTimeout(done);
    };
  }, [ready, startedAt, onDone]);
  return (
    <div
      role="status"
      aria-label={t("splash.label")}
      data-open={open}
      className="splash fixed inset-0 z-[100] overflow-hidden"
    >
      <Sky />
      <div className="splash-middle absolute inset-0 grid place-content-center justify-items-center gap-6">
        <div className="splash-flyer">
          <div className="splash-enter relative">
            <span aria-hidden className="splash-streaks">
              <span />
              <span />
              <span />
            </span>
            <div className="splash-float grid justify-items-center">
              <KoboldCharacter size={112} mood="calm" />
              <Carpet />
            </div>
          </div>
        </div>
        <p className="splash-words text-note text-muted-foreground">
          {t("splash.opening")}
        </p>
      </div>
    </div>
  );
}

function Sky() {
  return (
    <div aria-hidden className="absolute inset-0">
      {LAYERS.flatMap((layer) =>
        layer.tops.slice(0, layer.count).map((top, at) => {
          const style = {
            top: `${String(top)}%`,
            width: `${String(layer.width)}vw`,
            "--cross": `${String(layer.seconds)}s`,
            "--late": `${String(-(layer.seconds * (at + 0.35)) / layer.count)}s`,
            // Where it rests when nothing moves.
            "--rest": `${String(((at + 0.5) / layer.count) * 100 - 10)}vw`,
          } as CSSProperties;
          return (
            <span
              key={`${layer.depth}-${String(at)}`}
              className={`splash-cloud splash-cloud-${layer.depth}`}
              style={style}
            >
              <Cloud />
            </span>
          );
        }),
      )}
    </div>
  );
}

// A soft, modern cloud: one smooth outline, lit from above.
function Cloud() {
  return (
    <svg viewBox="0 0 220 90" className="block w-full overflow-visible">
      <path
        d="M30 78 C 6 78 4 50 26 46 C 24 24 52 14 70 28 C 80 6 122 4 132 30 C 150 14 184 22 184 48 C 210 48 214 78 190 78 Z"
        className="splash-cloud-shape"
      />
    </svg>
  );
}

// The magic carpet: a woven rug in the dashboard's colours, its edge
// rippling and its tassels swinging as it flies.
function Carpet() {
  return (
    <svg
      viewBox="0 0 200 44"
      width="190"
      aria-hidden
      className="splash-carpet -mt-5 overflow-visible"
    >
      <g className="splash-tassels-left">
        <line x1="12" y1="18" x2="2" y2="30" />
        <line x1="12" y1="24" x2="1" y2="38" />
      </g>
      <g className="splash-tassels-right">
        <line x1="188" y1="16" x2="199" y2="26" />
        <line x1="188" y1="22" x2="200" y2="34" />
      </g>
      <path
        className="splash-rug"
        d="M12 14 C 50 6 80 22 110 14 C 140 6 165 20 188 12 L 188 30 C 165 38 140 24 110 32 C 80 40 50 24 12 32 Z"
      />
      <path
        className="splash-rug-band"
        d="M24 19 C 56 12 82 26 110 19 C 138 12 162 24 176 18 L 176 25 C 162 31 138 19 110 26 C 82 33 56 19 24 26 Z"
      />
      <circle className="splash-rug-gem" cx="100" cy="23" r="3.2" />
    </svg>
  );
}
