import type { CSSProperties } from "react";

import type { DefaultVideosPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { VideoFacade } from "~/components/video-facade";

// Default's resolver, not dream's: this page keeps reading the existing
// `default.videos.*` keys, and only Default's field map is guaranteed to
// know their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { DreamOptionalEmptyState } from "../events/dream-optional-empty-state";
import {
  firstFilled,
  resolveDreamPageLogo,
} from "../events/dream-optional-page";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamRevealGroup } from "../shared/dream-reveal";
import { DreamSection } from "../shared/dream-section";

/**
 * A `Video` row carries both sync-owned columns (overwritten on every cron
 * run) and owner-override columns (written once by the admin UI and never
 * touched by sync). Resolution is always `override ?? synced` so an owner's
 * edits survive the next sync — never render `video.title` /
 * `video.description` / `video.thumbnailUrl` directly. (Same rule as
 * Default's videos page.)
 */
function resolveVideoCopy(
  video: DefaultVideosPageTemplateProps["videos"][number],
) {
  return {
    title: video.titleOverride ?? video.title,
    description: video.descriptionOverride ?? video.description,
    thumbnailUrl: video.thumbnailOverride ?? video.thumbnailUrl,
  };
}

/**
 * `/videos` — dream's video gallery on the generic page base (parity PF20):
 * the `DreamPageHero` sky band, then a 3 → 2 → 1 grid in one `DreamSection`
 * on the container edge. Each video sits in a `DreamPhoto`-style frame
 * (rounded-26, gold hairline) with an Italiana title and a soft two-line
 * description under it — the gallery register, not boxed cards.
 *
 * Data logic is Default's videos page's: `resolveVideoCopy` override
 * precedence, one `VideoFacade` per video (no iframe until clicked) and the
 * designed empty state. `.dream-embed` on each frame bridges the facade's
 * shadcn `muted` surfaces onto dream's sky tokens.
 */
export function DreamVideosPage({
  business,
  videos,
}: DefaultVideosPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.videos.hero-heading",
    "default.videos.hero-tagline",
    "default.videos.list-empty-heading",
    "default.videos.list-empty-body",
  ]);
  const { logoUrl, logoAlt } = resolveDreamPageLogo(business);

  return (
    <>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={firstFilled(f["default.videos.hero-heading"], "Videos")}
        titleFieldKey="default.videos.hero-heading"
        lede={f["default.videos.hero-tagline"] ?? ""}
        ledeFieldKey="default.videos.hero-tagline"
        sectionAttrs={sectionGroupAttr("videos", "hero")}
      />

      <DreamSection
        reveal={false}
        aria-label="All videos"
        sectionAttrs={sectionGroupAttr("videos", "list")}
      >
        {videos.length === 0 ? (
          <DreamOptionalEmptyState
            heading={firstFilled(
              f["default.videos.list-empty-heading"],
              "No videos yet",
            )}
            headingFieldKey="default.videos.list-empty-heading"
            body={f["default.videos.list-empty-body"]}
            bodyFieldKey="default.videos.list-empty-body"
          />
        ) : (
          <DreamRevealGroup
            threshold={0}
            className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
          >
            {videos.map((video, i) => {
              const { title, description, thumbnailUrl } =
                resolveVideoCopy(video);

              return (
                <article
                  key={video.id}
                  className="dream-reveal-item flex min-w-0 flex-col gap-4"
                  style={{ "--i": Math.min(i, 7) } as CSSProperties}
                >
                  <div className="dream-embed overflow-hidden rounded-[var(--dream-radius-photo)] border border-[var(--dream-line)] bg-[var(--dream-sky)]">
                    <VideoFacade
                      youtubeId={video.youtubeId}
                      title={title}
                      thumbnailUrl={thumbnailUrl}
                      className="rounded-none bg-[var(--dream-sky)]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-[clamp(22px,2.2vw,27px)] leading-[1.2]">
                      {title}
                    </h2>
                    {description ? (
                      <p className="line-clamp-2 text-[15px] leading-[1.6] text-[var(--dream-soft)]">
                        {description}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </DreamRevealGroup>
        )}
      </DreamSection>
    </>
  );
}
