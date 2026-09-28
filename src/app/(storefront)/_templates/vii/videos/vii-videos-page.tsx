import type { CSSProperties } from "react";

import type { DefaultVideosPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";
import { VideoFacade } from "~/components/video-facade";

// Default's resolver, not vii's: this page keeps reading the existing
// `default.videos.*` keys, and only Default's field map knows their
// `defaultValue`s — vii's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { ViiPageBand } from "../generic/vii-page-band";
import { ViiPageEmptyState } from "../generic/vii-page-empty-state";
import { ViiPageSection } from "../generic/vii-page-section";
import { nonBlank } from "../shared/vii-non-blank";
import { ViiRevealGroup } from "../shared/vii-reveal";

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
 * `/videos` — vii's video gallery on the generic base: the cream
 * `ViiPageBand` (clears the fixed header) and a `ViiPageSection` grid on
 * the same page edge (86px at 1440, 24px at 390). Data logic is Default's
 * videos page's: `resolveVideoCopy` override precedence, one `VideoFacade`
 * per video (no iframe until clicked), and the empty state.
 */
export function ViiVideosPage({
  business,
  videos,
}: DefaultVideosPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, [
    "default.videos.hero-eyebrow",
    "default.videos.hero-heading",
    "default.videos.hero-tagline",
    "default.videos.list-empty-heading",
    "default.videos.list-empty-body",
  ]);

  return (
    <PageTransition>
      <ViiPageBand
        sectionAttrs={sectionGroupAttr("videos", "hero")}
        overline={f["default.videos.hero-eyebrow"]}
        overlineFieldKey="default.videos.hero-eyebrow"
        title={nonBlank(f["default.videos.hero-heading"]) ?? "Videos"}
        titleFieldKey="default.videos.hero-heading"
        intro={f["default.videos.hero-tagline"]}
        introFieldKey="default.videos.hero-tagline"
      />

      {/* ── Video grid ─────────────────────────────────────────────────── */}
      <ViiPageSection sectionAttrs={sectionGroupAttr("videos", "list")}>
        {videos.length === 0 ? (
          <ViiPageEmptyState
            heading={
              nonBlank(f["default.videos.list-empty-heading"]) ??
              "No videos yet"
            }
            headingFieldKey="default.videos.list-empty-heading"
            body={f["default.videos.list-empty-body"]}
            bodyFieldKey="default.videos.list-empty-body"
          />
        ) : (
          <ViiRevealGroup
            threshold={0.04}
            className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
          >
            {videos.map((video, i) => {
              const { title, description, thumbnailUrl } =
                resolveVideoCopy(video);

              return (
                <article
                  key={video.id}
                  className="vii-reveal-item"
                  style={
                    {
                      "--i": Math.min(i, 7),
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      minWidth: 0,
                    } as CSSProperties
                  }
                >
                  <VideoFacade
                    youtubeId={video.youtubeId}
                    title={title}
                    thumbnailUrl={thumbnailUrl}
                    className="rounded-(--radius)"
                  />
                  <div>
                    <h2
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 400,
                        fontSize: "clamp(20px, 1.8vw, 24px)",
                        lineHeight: 1.25,
                        color: "var(--vii-navy)",
                        margin: 0,
                      }}
                    >
                      {title}
                    </h2>
                    {description && (
                      <p
                        className="line-clamp-2"
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 14,
                          lineHeight: 1.65,
                          color: "var(--vii-ink-soft)",
                          margin: "8px 0 0",
                        }}
                      >
                        {description}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </ViiRevealGroup>
        )}
      </ViiPageSection>
    </PageTransition>
  );
}
