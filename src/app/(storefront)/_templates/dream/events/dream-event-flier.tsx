import Image from "next/image";

import { cn } from "~/lib/utils";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";

import { DreamMark } from "../shared/dream-mark";

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

/** The `DreamPhoto` frame: rounded-26, gold hairline, sky ground. */
const FRAME =
  "relative overflow-hidden rounded-[var(--dream-radius-photo)] border border-[var(--dream-line)] bg-[var(--dream-sky)]";

/**
 * DreamEventFlier — one media slot per event, Default's precedence carried
 * over: video first, then image. Both letterbox (object-contain) inside a
 * 3:4 `DreamPhoto`-style frame, so no poster is ever cropped, and the shared
 * lightbox opens them full size.
 *
 * An event with no media gets dream's designed stand-in instead of an empty
 * box (craft floor: "every image slot has a designed fallback"): a sky tile
 * with the month in gold-ink Mulish, the day as one big Italiana numeral
 * (the `DreamSteps` numeral voice) and the mark at low opacity. It is
 * decorative (`aria-hidden`); the `<time>` beside it carries the date.
 */
export function DreamEventFlier({
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
          FRAME,
          "flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--dream-radius-photo-sm)] sm:aspect-[3/4] sm:h-auto sm:w-full sm:rounded-[var(--dream-radius-photo)]",
          className,
        )}
        style={{
          background:
            "linear-gradient(180deg, var(--dream-sky) 0%, var(--dream-sky-deep) 100%)",
        }}
      >
        <span className="text-[14px] font-semibold text-[var(--dream-gold-ink)] sm:text-[15px]">
          {month}
        </span>
        <span className="[font-family:var(--font-dream-display)] text-[44px] leading-[0.95] text-[var(--dream-ink)] sm:text-[76px]">
          {day}
        </span>
        <DreamMark className="mt-3 hidden h-7 w-7 opacity-35 sm:block" />
      </div>
    );
  }

  return (
    <div className={cn(FRAME, "aspect-[3/4] w-full", className)}>
      {coverVideo ? (
        <EventFlierVideo src={coverVideo} name={name} />
      ) : coverImage ? (
        // The dialog panel portals outside `.dream`, so its radius is a
        // literal (the `--dream-radius-photo` value) rather than the token.
        <EventFlierLightbox
          src={coverImage}
          alt={name}
          panelClassName="rounded-[26px]"
        >
          <div className="relative aspect-[3/4] w-full">
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
