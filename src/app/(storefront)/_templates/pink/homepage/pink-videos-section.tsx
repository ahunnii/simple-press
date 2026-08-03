import Link from "next/link";

import type { PinkVideo } from "../videos/pink-video-card";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { PinkReveal } from "../shared/pink-reveal";
import { PinkVideoCard } from "../videos/pink-video-card";

type Props = {
  heading: string;
  note: string;
  ctaLabel: string;
  ctaLink: string;
  emptyHeading: string;
  emptyBody: string;
  /** Already limited and ordered by `videos.getPublic`. */
  videos: PinkVideo[];
};

/**
 * `homepage.videos` — the first few published `Video` records, pulled from the
 * DB via `videos.getPublic`.
 *
 * Sits directly BELOW `homepage.events` (the ink "Make & Takes" band) on
 * purpose. Those clips are mostly a table mid-session, so they read as the
 * evidence for the claim the band above makes; putting them under it lets the
 * page argue and then show, rather than the other way round.
 *
 * It is deliberately NOT a third dark slab. Black is reserved for exactly two
 * surfaces in this template — that band and the footer — so this one runs on
 * the pale `--pink-panel` wash, stepping black → blush → white into the story
 * section below. That also makes the wash mean something consistent on this
 * page: `homepage.upcoming` above the band and `homepage.videos` below it are
 * the two DB-backed record rows, and they bracket the evergreen explainer
 * between them in the same surface.
 *
 * Hideable, and collapses to nothing when there is neither a video nor
 * empty-state copy — a fresh store with the `videos` flag on but no sources
 * registered yet must not open a void under the dark band.
 */
export function PinkVideosSection({
  heading,
  note,
  ctaLabel,
  ctaLink,
  emptyHeading,
  emptyBody,
  videos,
}: Props) {
  const hasVideos = videos.length > 0;
  const hasEmptyCopy = Boolean(emptyHeading || emptyBody);

  if (!hasVideos && !hasEmptyCopy) return null;

  // A lone 16:9 tile stretched across 1400px is a billboard, not a teaser, and
  // two look stranded in a three-track grid. The row adapts to what is
  // actually published — same rule as the upcoming-events band.
  const columnsClassName =
    videos.length === 1
      ? "grid-cols-1 md:max-w-[720px]"
      : videos.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      {...(heading
        ? { "aria-labelledby": "pink-videos-heading" }
        : { "aria-label": "Videos" })}
      className="px-5 py-16 md:px-10 md:py-24"
      style={{ background: "var(--pink-panel)" }}
      {...sectionGroupAttr("homepage", "videos")}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            {heading && (
              <h2
                id="pink-videos-heading"
                className="pink-display text-[clamp(1.625rem,2.8vw,2.375rem)] font-semibold tracking-[-0.025em]"
                style={{ color: "var(--pink-ink)" }}
                {...fieldAttr("pink.homepage.videos-heading")}
              >
                {heading}
              </h2>
            )}
            {/* The lead-in describes what's on screen, so it goes away with the
                clips rather than sitting over an empty state. */}
            {hasVideos && note && (
              <p
                className="max-w-[52ch] text-[1.0625rem] leading-[1.7]"
                style={{ color: "var(--pink-muted)" }}
                {...fieldAttr("pink.homepage.videos-note")}
              >
                {note}
              </p>
            )}
          </div>

          {hasVideos && ctaLabel && (
            <Link
              href={ctaLink}
              className="pink-btn pink-btn-ghost shrink-0"
              {...fieldAttr("pink.homepage.videos-cta-label")}
            >
              {ctaLabel}
            </Link>
          )}
        </div>

        {hasVideos ? (
          <div className={`mt-10 grid gap-x-6 gap-y-10 ${columnsClassName}`}>
            {videos.map((video, i) => (
              <PinkReveal key={video.id} index={i}>
                <PinkVideoCard video={video} compact headingLevel="h3" />
              </PinkReveal>
            ))}
          </div>
        ) : (
          // Designed empty state rather than a bare gap. `<p>` not a heading:
          // the band already owns the only heading it needs, and an h3 with no
          // section under it reads as a broken outline.
          <div
            className="mt-10 flex flex-col gap-2 px-6 py-10 text-center"
            style={{
              background: "var(--pink-white)",
              border: "1px solid var(--pink-line)",
            }}
          >
            {emptyHeading && (
              <p
                className="pink-display text-[1.125rem] font-semibold"
                style={{ color: "var(--pink-ink)" }}
                {...fieldAttr("pink.homepage.videos-empty-heading")}
              >
                {emptyHeading}
              </p>
            )}
            {emptyBody && (
              <p
                className="mx-auto max-w-[46ch] text-[0.9375rem] leading-[1.7]"
                style={{ color: "var(--pink-muted)" }}
                {...fieldAttr("pink.homepage.videos-empty-body")}
              >
                {emptyBody}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
