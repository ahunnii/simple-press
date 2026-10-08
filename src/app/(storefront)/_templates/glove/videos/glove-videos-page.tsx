import type { DefaultVideosPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { VideoFacade } from "~/components/video-facade";

// Default's resolver, not glove's: this page keeps reading the existing
// `default.videos.*` keys; only Default's field map knows their defaults.
import { resolveFields as resolveDefaultFields } from "../../default";
import { GloveEmptyState } from "../generic/glove-empty-state";
import { GloveGeneralLayout } from "../generic/glove-general-layout";
import {
  GloveOverline,
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
} from "../shared";

/**
 * A `Video` row carries sync-owned columns (overwritten on every cron run)
 * and owner-override columns (written once by the admin UI). Resolution is
 * always `override ?? synced` so an owner's edits survive the next sync;
 * never render `video.title` / `description` / `thumbnailUrl` directly.
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

const FIELD_KEYS = [
  "default.videos.hero-eyebrow",
  "default.videos.hero-heading",
  "default.videos.hero-tagline",
  "default.videos.list-empty-heading",
  "default.videos.list-empty-body",
];

/**
 * `/videos` — glove's video gallery on the generic base (navy band + 1222px
 * container), carrying Default's data logic: `resolveVideoCopy` override
 * precedence, a `VideoFacade` per video (no iframe until clicked) and the
 * empty state.
 */
export function GloveVideosPage({
  business,
  videos,
}: DefaultVideosPageTemplateProps) {
  const f = resolveDefaultFields(
    business.siteContent?.customFields,
    FIELD_KEYS,
  );
  const get = (key: string) => f[key] ?? "";

  const heading = get("default.videos.hero-heading").trim() || "Videos";
  const eyebrow = get("default.videos.hero-eyebrow");

  return (
    <GloveGeneralLayout
      title={heading}
      titleFieldKey="default.videos.hero-heading"
      subtitle={get("default.videos.hero-tagline")}
      subtitleFieldKey="default.videos.hero-tagline"
      breadcrumb={[{ label: "Home", href: "/" }, { label: heading }]}
      sectionAttrs={sectionGroupAttr("videos", "hero")}
    >
      <GloveSection
        tone="paper"
        aria-label={heading}
        sectionAttrs={sectionGroupAttr("videos", "list")}
        reveal={false}
      >
        {eyebrow ? (
          <GloveOverline
            fieldKey="default.videos.hero-eyebrow"
            className="mb-8 md:mb-10"
          >
            {eyebrow}
          </GloveOverline>
        ) : null}

        {videos.length === 0 ? (
          <GloveEmptyState
            heading={get("default.videos.list-empty-heading")}
            headingFieldKey="default.videos.list-empty-heading"
            body={get("default.videos.list-empty-body")}
            bodyFieldKey="default.videos.list-empty-body"
          />
        ) : (
          <GloveRevealGroup
            threshold={0}
            className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
          >
            {videos.map((video, i) => {
              const { title, description, thumbnailUrl } =
                resolveVideoCopy(video);
              return (
                <article
                  key={video.id}
                  className="glove-reveal-item flex h-full flex-col"
                  style={gloveRevealItemStyle(i)}
                >
                  <VideoFacade
                    youtubeId={video.youtubeId}
                    title={title}
                    thumbnailUrl={thumbnailUrl}
                    className="rounded-[12px]"
                  />
                  <h2 className="glove-display mt-5 text-[20px] leading-[1.3] font-medium text-[var(--glove-ink)]">
                    {title}
                  </h2>
                  {description ? (
                    <p className="glove-body mt-2 line-clamp-3 text-[15px] leading-relaxed text-[var(--glove-text)]">
                      {description}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </GloveRevealGroup>
        )}
      </GloveSection>
    </GloveGeneralLayout>
  );
}
