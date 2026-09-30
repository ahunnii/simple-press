import { Leaf, PlayCircle } from "lucide-react";

import type { DefaultVideosPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { VideoFacade } from "~/components/video-facade";

import { resolveFields } from "..";
// Default's resolver, not bamboo's: this page keeps reading the existing
// `default.videos.*` keys, and only Default's field map knows their
// `defaultValue`s — bamboo's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { BambooPageHero } from "../shared/bamboo-page-hero";

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
 * `/videos` — bamboo's video gallery on the generic page's base: the shared
 * `BambooPageHero` title band (carries `BAMBOO_TOP_MARKER`) over a cream
 * section whose `max-w-7xl px-4 lg:px-8` grid shares the band's left edge
 * (B1.2/B1.7). Data logic is Default's videos page's: `resolveVideoCopy`
 * override precedence, one `VideoFacade` per video (no iframe until
 * clicked), and the empty state, with copy from Default's `default.videos.*`
 * fields read through Default's resolver.
 */
export function BambooVideosPage({
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
  // Generic-base parity: the site-wide page-hero photo applies here exactly
  // as it does on generic CMS pages (no per-page override field).
  const heroBgImage = resolveFields(customFields, [
    "bamboo.global.page-hero-bg-image",
  ])["bamboo.global.page-hero-bg-image"];

  return (
    <PageTransition>
      <BambooPageHero
        sectionAttrs={sectionGroupAttr("videos", "hero")}
        eyebrow={f["default.videos.hero-eyebrow"]}
        eyebrowFieldKey="default.videos.hero-eyebrow"
        eyebrowIcon={Leaf}
        title={(f["default.videos.hero-heading"] ?? "") || "Videos"}
        titleFieldKey="default.videos.hero-heading"
        lede={f["default.videos.hero-tagline"]}
        ledeFieldKey="default.videos.hero-tagline"
        bgImage={heroBgImage}
      />

      {/* ── Video grid (cream — declares no background) ─────────────────── */}
      <section {...sectionGroupAttr("videos", "list")} className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {videos.length === 0 ? (
            <FadeIn direction="up">
              <div className="bg-card flex max-w-3xl flex-col items-center rounded-2xl border border-[var(--bam-hairline)] px-6 py-16 text-center md:py-20">
                <div className="flex size-16 items-center justify-center rounded-full border border-[var(--bam-gold)]/40 bg-[var(--bam-gold)]/10">
                  <PlayCircle
                    className="size-7 text-[var(--bam-forest)]"
                    aria-hidden="true"
                  />
                </div>
                <h2
                  className="text-foreground mt-6 text-xl font-semibold"
                  {...fieldAttr("default.videos.list-empty-heading")}
                >
                  {(f["default.videos.list-empty-heading"] ?? "") ||
                    "No videos yet"}
                </h2>
                {f["default.videos.list-empty-body"] ? (
                  <p
                    className="text-muted-foreground mt-2 max-w-md leading-relaxed"
                    {...fieldAttr("default.videos.list-empty-body")}
                  >
                    {f["default.videos.list-empty-body"]}
                  </p>
                ) : null}
              </div>
            </FadeIn>
          ) : (
            <StaggerContainer className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => {
                const { title, description, thumbnailUrl } =
                  resolveVideoCopy(video);

                return (
                  <StaggerItem key={video.id} className="h-full">
                    <article className="bg-card flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--bam-hairline)] shadow-sm transition-shadow hover:shadow-md">
                      <VideoFacade
                        youtubeId={video.youtubeId}
                        title={title}
                        thumbnailUrl={thumbnailUrl}
                        className="rounded-none"
                      />
                      <div className="flex flex-1 flex-col p-6">
                        <h2 className="text-foreground text-lg leading-snug font-bold">
                          {title}
                        </h2>
                        {description && (
                          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                            {description}
                          </p>
                        )}
                      </div>
                    </article>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
