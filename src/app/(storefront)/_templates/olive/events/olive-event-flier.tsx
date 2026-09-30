import Image from "next/image";

import { cn } from "~/lib/utils";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";

import { OliveLeafMark } from "../shared";

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
 * OliveEventFlier — one media slot per event, Default's precedence carried
 * over: video first, then image. Both letterbox (object-contain) inside a
 * 3:4 paper frame, so no poster is ever cropped, and the shared lightbox
 * opens them full size.
 *
 * An event with no media gets olive's designed stand-in instead of an empty
 * box: a paper date tile (month in the tracked label face, the day as one
 * big Josefin numeral, the leaf rivet) — the same "draw the absence" idea as
 * `OliveEmptyState`. It is decorative (`aria-hidden`); the `<time>` beside it
 * carries the date for assistive tech.
 */
export function OliveEventFlier({
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
          "flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 sm:aspect-[3/4] sm:h-auto sm:w-full",
          className,
        )}
        style={{
          backgroundColor: "var(--olive-paper)",
          border: "1px solid var(--olive-hairline)",
          borderRadius: "var(--olive-card-radius)",
        }}
      >
        <span className="olive-label" style={{ color: "var(--olive-leaf)" }}>
          {month}
        </span>
        <span
          className="text-[2.5rem] sm:text-[4.5rem]"
          style={{
            fontFamily: "var(--olive-font-display)",
            fontWeight: 300,
            lineHeight: 0.95,
            color: "var(--olive-ink)",
          }}
        >
          {day}
        </span>
        <span
          className="hidden sm:flex"
          style={{ color: "var(--olive-sage-bright)", marginTop: "0.5rem" }}
        >
          <OliveLeafMark size={18} />
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("relative aspect-[3/4] w-full overflow-hidden", className)}
      style={{
        backgroundColor: "var(--olive-paper)",
        border: "1px solid var(--olive-hairline)",
        borderRadius: "var(--olive-card-radius)",
      }}
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
