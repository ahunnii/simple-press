import type { DefaultVideosPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { VideoFacade } from "~/components/video-facade";

// Default's resolver, not noise's: this page keeps reading the existing
// `default.videos.*` keys, and only Default's field map knows their
// `defaultValue`s — noise's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { NoiseEmptyState } from "../generic/noise-empty-state";
import {
  NOISE_META_CLASS,
  NoisePageBand,
  NoisePageBody,
} from "../generic/noise-page-shell";
import { nonBlank } from "../shared/noise-non-blank";

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
 * `/videos` — noise's video gallery on the generic page base (PF12): the
 * centred title band, then the blog grid's rhythm on the wide container —
 * an ink-framed 16:9 `VideoFacade` (no iframe until clicked), a mono index,
 * an italic Cormorant title and a two-line description. Data logic is
 * Default's videos page's (`resolveVideoCopy` override precedence, the
 * designed empty state).
 */
export function NoiseVideosPage({
  business,
  videos,
}: DefaultVideosPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.videos.hero-eyebrow",
    "default.videos.hero-heading",
    "default.videos.hero-tagline",
    "default.videos.list-empty-heading",
    "default.videos.list-empty-body",
  ]);

  return (
    <PageTransition>
      <NoisePageBand
        sectionAttrs={sectionGroupAttr("videos", "hero")}
        overline={f["default.videos.hero-eyebrow"]}
        overlineFieldKey="default.videos.hero-eyebrow"
        title={nonBlank(f["default.videos.hero-heading"]) ?? "Videos"}
        titleFieldKey="default.videos.hero-heading"
        intro={f["default.videos.hero-tagline"]}
        introFieldKey="default.videos.hero-tagline"
      />

      <NoisePageBody
        width="wide"
        aria-label="All videos"
        sectionAttrs={sectionGroupAttr("videos", "list")}
      >
        {videos.length === 0 ? (
          <NoiseEmptyState
            heading={
              nonBlank(f["default.videos.list-empty-heading"]) ??
              "No videos yet"
            }
            headingFieldKey="default.videos.list-empty-heading"
            body={f["default.videos.list-empty-body"]}
            bodyFieldKey="default.videos.list-empty-body"
          />
        ) : (
          <StaggerContainer
            className="grid grid-cols-1 gap-x-6 gap-y-12 border-t-2 border-(--vn-ink) pt-12 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.07}
          >
            {videos.map((video, i) => {
              const { title, description, thumbnailUrl } =
                resolveVideoCopy(video);

              return (
                <StaggerItem key={video.id} className="min-w-0">
                  <article aria-labelledby={`noise-video-${video.id}`}>
                    <div className="overflow-hidden border border-(--vn-ink)">
                      <VideoFacade
                        youtubeId={video.youtubeId}
                        title={title}
                        thumbnailUrl={thumbnailUrl}
                      />
                    </div>
                    <p
                      className={`mt-4 ${NOISE_META_CLASS}`}
                      aria-hidden="true"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h2
                      id={`noise-video-${video.id}`}
                      className="mt-2.5 font-serif leading-[1.15] tracking-tight break-words italic"
                      style={{ fontSize: "22px", letterSpacing: "-0.005em" }}
                    >
                      {title}
                    </h2>
                    {description ? (
                      <p className="mt-2 line-clamp-2 font-sans text-sm leading-relaxed text-(--vn-steel-mist)">
                        {description}
                      </p>
                    ) : null}
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </NoisePageBody>
    </PageTransition>
  );
}
