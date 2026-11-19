// How every box people type or choose in looks (the design's inputs): 32px
// high, a hairline border, 8px corners, 13px text, a soft grey ring when
// focused. Text areas take FIELD_AREA (no fixed height).

const BASE =
  "w-full min-w-0 rounded-lg border border-border bg-card text-[13px] text-foreground shadow-[0_1px_1px_rgb(20_24_36/0.03)] outline-none transition-[border-color,box-shadow] placeholder:text-faint hover:border-[#d2d4dc] focus-visible:border-[#a9adba] focus-visible:ring-[3px] focus-visible:ring-[#e8e9ee] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

export const FIELD = `${BASE} h-8 px-2.5`;

export const FIELD_AREA = `${BASE} px-2.5 py-1.5 leading-relaxed`;
