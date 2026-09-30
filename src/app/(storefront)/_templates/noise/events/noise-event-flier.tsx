import Image from "next/image";

import { cn } from "~/lib/utils";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";

import { NOISE_HATCH_BACKGROUND } from "../generic/noise-page-shell";

/**
 * Month + day of an event's start, in the SHOP's zone, for the flier's
 * no-media tile. Same rule as `~/lib/events/format`: an explicit `timeZone`
 * and a pinned "en-US" locale, never the ambient zone — otherwise the server
 * render and the hydrated client disagree for a viewer in another zone.
 */
export function noiseEventDateParts(
  startAt: Date | string,
  timeZone: string,
): { month: string; day: string } {
  const date = new Date(startAt);
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
  }).format(date);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "numeric",
  }).format(date);
  return { month, day };
}

type Props = {
  name: string;
  coverImage: string | null;
  coverVideo: string | null;
  /** Start month + day in the shop's zone, drawn on the no-media tile. */
  month: string;
  day: string;
  /** next/image `sizes` for the flier. */
  sizes: string;
  priority?: boolean;
  className?: string;
};

/**
 * NoiseEventFlier — one media slot per event, Default's precedence carried
 * over: video first, then image. Both letterbox (object-contain) inside a
 * 3:4 ink-ruled frame so no poster is cropped, and the shared lightbox
 * opens them full size.
 *
 * An event with no media gets noise's placeholder instead of an empty box:
 * the blog's hatched dark tile with the month in mono and the day as an
 * italic Cormorant numeral. It is decorative (`aria-hidden`); the `<time>`
 * beside it carries the date for assistive tech.
 */
export function NoiseEventFlier({
  name,
  coverImage,
  coverVideo,
  month,
  day,
  sizes,
  priority = false,
  className,
}: Props) {
  if (!coverVideo && !coverImage) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 border border-(--vn-ink) sm:aspect-[3/4] sm:h-auto sm:w-full",
          className,
        )}
        style={{ background: NOISE_HATCH_BACKGROUND, color: "var(--vn-bone)" }}
      >
        <span className="font-mono text-[9.5px] tracking-[0.28em] uppercase">
          {month}
        </span>
        <span
          className="font-serif leading-none italic"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
        >
          {day}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden border border-(--vn-ink) bg-(--vn-line-soft)",
        className,
      )}
    >
      {coverVideo ? (
        <EventFlierVideo src={coverVideo} name={name} />
      ) : coverImage ? (
        <EventFlierLightbox src={coverImage} alt={name}>
          <div className="relative h-full w-full">
            <Image
              src={coverImage}
              alt={name}
              fill
              priority={priority}
              className="object-contain"
              sizes={sizes}
            />
          </div>
        </EventFlierLightbox>
      ) : null}
    </div>
  );
}
