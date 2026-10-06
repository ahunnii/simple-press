import type { CSSProperties } from "react";

import type { DefaultVideosPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";
import { VideoFacade } from "~/components/video-facade";

// umsc's own resolver for the band's optional photo (`umsc.videos.hero-*`).
import { resolveFields } from "..";
// Default's resolver, not umsc's: this page keeps reading the existing
// `default.videos.*` keys, and only Default's field map knows their
// `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { UmscEmptyState } from "../generic/umsc-page-kit";
import { resolveUmscHeroPhoto } from "../shared/umsc-hero-fields";
import { nonBlank } from "../shared/umsc-non-blank";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

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
 * `/videos` — umsc's video shelf on the generic page base (parity PF23): the
 * black `UmscPageHero`, then a 3→2→1 grid on the shared container — each a
 * hairline-framed 16:9 `VideoFacade` (no iframe until clicked), the title in
 * the product-name face and two lines of description — setting in left to
 * right like a product shelf. Data logic is Default's videos page's
 * (`resolveVideoCopy` override precedence, the designed empty state).
 */
export function UmscVideosPage({
  business,
  videos,
}: DefaultVideosPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, [
    "default.videos.hero-heading",
    "default.videos.hero-tagline",
    "default.videos.list-empty-heading",
    "default.videos.list-empty-body",
  ]);
  const heroPhoto = resolveUmscHeroPhoto(
    resolveFields(customFields, [
      "umsc.videos.hero-image",
      "umsc.videos.hero-image-alt",
      "umsc.videos.hero-image-behind",
    ]),
    "videos",
  );

  return (
    <PageTransition>
      <UmscPageHero
        heading={nonBlank(f["default.videos.hero-heading"]) ?? "Videos"}
        headingFieldKey="default.videos.hero-heading"
        lede={f["default.videos.hero-tagline"] ?? ""}
        ledeFieldKey="default.videos.hero-tagline"
        {...heroPhoto}
        sectionAttrs={sectionGroupAttr("videos", "hero")}
      />

      <UmscSection
        tone="paper"
        aria-label="All videos"
        sectionAttrs={sectionGroupAttr("videos", "list")}
      >
        {videos.length === 0 ? (
          <UmscEmptyState
            heading={
              nonBlank(f["default.videos.list-empty-heading"]) ??
              "No videos yet"
            }
            headingFieldKey="default.videos.list-empty-heading"
            body={f["default.videos.list-empty-body"]}
            bodyFieldKey="default.videos.list-empty-body"
          />
        ) : (
          <UmscRevealGroup className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, i) => {
              const { title, description, thumbnailUrl } =
                resolveVideoCopy(video);

              return (
                <article
                  key={video.id}
                  aria-labelledby={`umsc-video-${video.id}`}
                  className="umsc-reveal-item min-w-0"
                  style={{ "--i": Math.min(i, 6) } as CSSProperties}
                >
                  <div className="overflow-hidden border border-[var(--umsc-line)] bg-[var(--umsc-cream)]">
                    <VideoFacade
                      youtubeId={video.youtubeId}
                      title={title}
                      thumbnailUrl={thumbnailUrl}
                    />
                  </div>
                  <h2
                    id={`umsc-video-${video.id}`}
                    className="umsc-sans mt-4 text-[18px] leading-[1.35] font-semibold tracking-[-0.02em] break-words text-[var(--umsc-ink)]"
                  >
                    {title}
                  </h2>
                  {description ? (
                    <p className="umsc-sans mt-1.5 line-clamp-2 text-[15px] leading-[1.6] text-[var(--umsc-muted)]">
                      {description}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </UmscRevealGroup>
        )}
      </UmscSection>
    </PageTransition>
  );
}
