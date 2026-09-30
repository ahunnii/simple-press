import Image from "next/image";

import { cn } from "~/lib/utils";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";

/**
 * Month + day of an event's start, in the SHOP's zone, for the flier's
 * no-media tile. Same rule as `~/lib/events/format`: an explicit `timeZone`
 * and a pinned "en-US" locale, never the ambient zone — otherwise the server
 * render and the hydrated client disagree for a viewer in another zone.
 */
export function umscEventDateParts(
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
 * UmscEventFlier — one media slot per event, Default's precedence carried
 * over: video first, then image. Both letterbox (object-contain) inside a
 * 3:4 hairline frame on the cream shelf so no poster is cropped, and the
 * shared lightbox opens them full size.
 *
 * An event with no media gets umsc's stand-in instead of an empty box: the
 * cream tile with the month in the uppercase meta face and the day as a
 * Marcellus numeral. Decorative
 * (`aria-hidden`); the `<time>` beside it carries the date for assistive
 * tech.
 */
export function UmscEventFlier({
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
          "flex size-24 shrink-0 flex-col items-center justify-center gap-1 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] sm:aspect-[3/4] sm:size-auto sm:w-full",
          className,
        )}
      >
        <span className="umsc-sans text-[11px] font-semibold tracking-[0.13em] text-[var(--umsc-gold-ink)] uppercase">
          {month}
        </span>
        <span className="umsc-serif text-[clamp(34px,5vw,64px)] leading-none text-[var(--umsc-ink)]">
          {day}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden border border-[var(--umsc-line)] bg-[var(--umsc-cream)]",
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
