import type { CSSProperties } from "react";

import type { DefaultVideosPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { VideoFacade } from "~/components/video-facade";

// Default's resolver, not olive's: this page keeps reading the existing
// `default.videos.*` keys, and only Default's field map knows their
// `defaultValue`s — olive's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { OlivePageBand } from "../generic/olive-page-band";
import { OlivePageSection } from "../generic/olive-page-section";
import { OliveEmptyState, OliveRevealGroup } from "../shared";

/** First non-blank string wins (a cleared field resolves to "", not null). */
function firstFilled(...candidates: (string | null | undefined)[]): string {
  return candidates.find((c) => c?.trim()) ?? "";
}

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
 * `/videos` — olive's video gallery on the generic base: the white
 * `OlivePageBand`, then a grid of paper cards in one `OlivePageSection` on
 * the same left edge. Data logic is Default's videos page's:
 * `resolveVideoCopy` override precedence, one `VideoFacade` per video (no
 * iframe until clicked) and the designed empty state.
 */
export function OliveVideosPage({
  business,
  videos,
}: DefaultVideosPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.videos.hero-heading",
    "default.videos.hero-tagline",
    "default.videos.list-empty-heading",
    "default.videos.list-empty-body",
  ]);

  return (
    <>
      <OlivePageBand
        sectionAttrs={sectionGroupAttr("videos", "hero")}
        title={firstFilled(f["default.videos.hero-heading"], "Videos")}
        titleFieldKey="default.videos.hero-heading"
        intro={f["default.videos.hero-tagline"]}
        introFieldKey="default.videos.hero-tagline"
      />

      <OlivePageSection
        flush
        aria-label="All videos"
        sectionAttrs={sectionGroupAttr("videos", "list")}
      >
        {videos.length === 0 ? (
          <OliveEmptyState
            headingAs="h2"
            className="w-full"
            heading={firstFilled(
              f["default.videos.list-empty-heading"],
              "No videos yet",
            )}
            headingFieldKey="default.videos.list-empty-heading"
            body={f["default.videos.list-empty-body"]}
            bodyFieldKey="default.videos.list-empty-body"
          />
        ) : (
          <OliveRevealGroup
            threshold={0}
            fan
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {videos.map((video, i) => {
              const { title, description, thumbnailUrl } =
                resolveVideoCopy(video);

              return (
                <article
                  key={video.id}
                  className="olive-card olive-card-paper olive-reveal-item flex min-w-0 flex-col overflow-hidden"
                  style={{ "--i": Math.min(i, 8) } as CSSProperties}
                >
                  <VideoFacade
                    youtubeId={video.youtubeId}
                    title={title}
                    thumbnailUrl={thumbnailUrl}
                  />
                  <div className="flex flex-col gap-2 p-5">
                    <h2 className="olive-h3">{title}</h2>
                    {description ? (
                      <p className="olive-caption line-clamp-2">
                        {description}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </OliveRevealGroup>
        )}
      </OlivePageSection>
    </>
  );
}
