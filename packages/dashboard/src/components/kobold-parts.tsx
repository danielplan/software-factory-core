// The kobold's own drawing, shared by the kobold (kobold-character.tsx) and
// its family, the personas (persona-monster.tsx), so they are the same
// creature: the gradients that give it volume, its round body with a
// highlight, the pointed ears its family wears (the kobold itself has none),
// its face (eyes with a light in them, pink cheeks) and its own blue hat. On a 200 by 200 grid; the class names are the ones the
// kobold's moods move (kobold-character.css).

// A hat's three tones: light, middle and shade.
export type HatTones = readonly [string, string, string];

export const BLUE_HAT: HatTones = ["#4f7bff", "#2a55e8", "#1b3cb8"];

// The gradients, under ids of their own so several on one page do not
// share them: body, ears, hat and the shadow on the ground.
export function KoboldPaints({
  id,
  hat,
}: Readonly<{ id: string; hat: HatTones }>) {
  return (
    <defs>
      <radialGradient id={`${id}-body`} cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.55" stopColor="#e6e8fb" />
        <stop offset="1" stopColor="#b7bde9" />
      </radialGradient>
      <linearGradient id={`${id}-ear`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#f3f4fd" />
        <stop offset="1" stopColor="#aab1e2" />
      </linearGradient>
      <linearGradient id={`${id}-hat`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor={hat[0]} />
        <stop offset="0.6" stopColor={hat[1]} />
        <stop offset="1" stopColor={hat[2]} />
      </linearGradient>
      <radialGradient id={`${id}-shadow`}>
        <stop offset="0" stopColor="#111827" stopOpacity="0.28" />
        <stop offset="1" stopColor="#111827" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export function KoboldBody({ id }: Readonly<{ id: string }>) {
  return (
    <g className="k-body">
      <ellipse cx="100" cy="132" rx="52" ry="47" fill={`url(#${id}-body)`} />
      <ellipse cx="80" cy="110" rx="15" ry="9" fill="#ffffff" opacity="0.75" />
    </g>
  );
}

export function KoboldEars({ id }: Readonly<{ id: string }>) {
  const fill = `url(#${id}-ear)`;
  return (
    <>
      <g className="k-ear-l">
        <path d="M58 124 Q34 128 20 146 Q42 145 60 138 Z" fill={fill} />
      </g>
      <g className="k-ear-r">
        <path d="M142 124 Q166 128 180 146 Q158 145 140 138 Z" fill={fill} />
      </g>
    </>
  );
}

export function KoboldFace() {
  return (
    <g className="k-face">
      <ellipse cx="74" cy="146" rx="7" ry="4" fill="#f9a8d4" opacity="0.45" />
      <ellipse cx="126" cy="146" rx="7" ry="4" fill="#f9a8d4" opacity="0.45" />
      <g className="k-eyes">
        <ellipse cx="86" cy="130" rx="6" ry="9" fill="#1b1f3b" />
        <ellipse cx="114" cy="130" rx="6" ry="9" fill="#1b1f3b" />
        <circle cx="88" cy="126" r="2.2" fill="#ffffff" />
        <circle cx="116" cy="126" r="2.2" fill="#ffffff" />
      </g>
    </g>
  );
}

// The kobold's own hat: its blue cone and darker band, then its bent tip,
// which the kobold's moods sway a beat later (k-tip).
export function KoboldHat({ id }: Readonly<{ id: string }>) {
  return (
    <g className="k-hat">
      <path
        d="M56 96 Q66 54 100 34 Q130 50 144 96 Z"
        fill={`url(#${id}-hat)`}
      />
      <ellipse cx="100" cy="95" rx="47" ry="9" fill="#1a3394" />
      <g className="k-tip-catch">
        <g className="k-tip">
          <path d="M98 36 Q122 16 150 28 Q132 31 118 46 Z" fill="#2f5cf0" />
        </g>
      </g>
    </g>
  );
}
