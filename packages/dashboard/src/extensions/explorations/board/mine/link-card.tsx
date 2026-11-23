// A link as a shared one looks: a preview picture across the top, the page's
// title in bold, below it the site's small icon and name. A page that shares
// no preview picture (or has not yet, or could not be read) shows the
// simple card: the site's icon, the address and the title. A click opens it
// in a new tab.

import { useTranslation } from "react-i18next";

import { hueOf, shownOf } from "./address";
import { useMine } from "./mine-state";
import type { Link } from "./own";

// The site's small icon: the one its page shares, or its first letter on a
// colour of its own.
function SiteIcon({ item, size }: Readonly<{ item: Link; size: number }>) {
  const mine = useMine();
  if (item.icon)
    return (
      <img
        src={mine.picture(item.icon)}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="flex-none rounded-[5px] object-contain"
      />
    );
  const hue = hueOf(item.site);
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: size * 0.62,
        background: `linear-gradient(135deg, hsl(${String(hue)} 65% 55%), hsl(${String((hue + 45) % 360)} 65% 42%))`,
      }}
      className="grid flex-none place-items-center rounded-[5px] leading-none font-semibold text-white"
    >
      {item.site.charAt(0).toUpperCase()}
    </span>
  );
}

export function LinkBody({ item }: Readonly<{ item: Link }>) {
  const t = useTranslation().t;
  const mine = useMine();
  const opens = t("explore.board.mine.linkOpens", { site: item.site });
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer noopener"
      draggable={false}
      title={opens}
      aria-label={`${item.title}. ${opens}`}
      className="block overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--line-soft)] transition-shadow hover:shadow-[0_0_0_1.5px_var(--blue)]"
    >
      {item.preview ? (
        <>
          <img
            src={mine.picture(item.preview)}
            alt=""
            draggable={false}
            className="block aspect-[1.91/1] w-full bg-ground object-cover"
          />
          <span className="grid gap-1 p-2.5">
            <span className="line-clamp-2 text-[13.5px] leading-snug font-semibold break-words">
              {item.title}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <SiteIcon item={item} size={14} />
              <span className="truncate">{item.site}</span>
            </span>
          </span>
        </>
      ) : (
        <span className="flex min-w-0 items-center gap-2.5 p-2.5">
          <SiteIcon item={item} size={28} />
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="line-clamp-2 text-[13px] leading-snug font-semibold break-words">
              {item.title}
            </span>
            <span className="truncate text-[11.5px] text-muted-foreground">
              {shownOf(item.url)}
            </span>
          </span>
        </span>
      )}
    </a>
  );
}
