import { PlayCircle } from "lucide-react";

import type { DefaultVideosPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { VideoFacade } from "~/components/video-facade";

// Default's resolver, not pollen's: this page keeps reading the existing
// `default.videos.*` keys, and only Default's field map knows their
// `defaultValue`s — pollen's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";

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
 * `/videos` — pollen's video gallery on the generic base
 * (`PollenGeneralLayout` band + max-w-7xl grid), with Default's videos page's
 * data logic: `resolveVideoCopy` override precedence, `VideoFacade` per
 * video (no iframe until clicked), and the empty state. Ends on the global
 * pollen CTA.
 */
export function PollenVideosPage({
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

  const tagline = f["default.videos.hero-tagline"] ?? "";

  return (
    <PollenGeneralLayout
      business={business}
      title={f["default.videos.hero-heading"] ?? "Videos"}
      subtitle={f["default.videos.hero-eyebrow"] ?? ""}
      titleFieldKey="default.videos.hero-heading"
      subtitleFieldKey="default.videos.hero-eyebrow"
      sectionAttrs={sectionGroupAttr("videos", "hero")}
    >
      {/* ── Video grid ─────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("videos", "list")}
        className="bg-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* The band has no slot for a tagline, so it opens the body —
              left-aligned to the grid's edge, capped at a readable measure. */}
          {tagline && (
            <FadeIn direction="up" className="mb-12 md:mb-16">
              <p
                className="max-w-3xl text-lg leading-relaxed text-[#4b5563] md:text-xl"
                {...fieldAttr("default.videos.hero-tagline")}
              >
                {tagline}
              </p>
            </FadeIn>
          )}

          {videos.length === 0 ? (
            <FadeIn direction="up">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-[#f5f2ee] px-6 py-24 text-center">
                <PlayCircle
                  className="mb-4 h-10 w-10 text-[#215935]/60"
                  aria-hidden="true"
                />
                <p
                  className="text-lg font-semibold text-[#374151]"
                  {...fieldAttr("default.videos.list-empty-heading")}
                >
                  {f["default.videos.list-empty-heading"] ?? "No videos yet"}
                </p>
                {f["default.videos.list-empty-body"] && (
                  <p
                    className="mt-2 max-w-md text-sm leading-relaxed text-[#6b7280]"
                    {...fieldAttr("default.videos.list-empty-body")}
                  >
                    {f["default.videos.list-empty-body"]}
                  </p>
                )}
              </div>
            </FadeIn>
          ) : (
            <StaggerContainer className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => {
                const { title, description, thumbnailUrl } =
                  resolveVideoCopy(video);

                return (
                  <StaggerItem key={video.id} className="h-full">
                    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
                      <VideoFacade
                        youtubeId={video.youtubeId}
                        title={title}
                        thumbnailUrl={thumbnailUrl}
                        className="rounded-none"
                      />
                      <div className="flex flex-1 flex-col p-5 md:p-6">
                        <h2 className="text-lg font-bold text-[#374151]">
                          {title}
                        </h2>
                        {description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#6b7280]">
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
    </PollenGeneralLayout>
  );
}
