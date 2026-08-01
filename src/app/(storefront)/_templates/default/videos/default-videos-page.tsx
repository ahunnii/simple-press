import type { DefaultVideosPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";
import { VideoFacade } from "~/components/video-facade";

import { resolveFields } from "..";

/**
 * A `Video` row carries both sync-owned columns (overwritten on every cron
 * run) and owner-override columns (written once by the admin UI and never
 * touched by sync). Resolution is always `override ?? synced` so an owner's
 * edits survive the next sync — never render `video.title` /
 * `video.description` / `video.thumbnailUrl` directly.
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

export function DefaultVideosPage({
  business,
  videos,
}: DefaultVideosPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "default.videos.hero-eyebrow",
    "default.videos.hero-heading",
    "default.videos.hero-tagline",
    "default.videos.list-empty-heading",
    "default.videos.list-empty-body",
  ]);

  return (
    <PageTransition>
      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("videos", "hero")}
        className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          {f["default.videos.hero-eyebrow"] && (
            <span
              className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
              {...fieldAttr("default.videos.hero-eyebrow")}
            >
              {f["default.videos.hero-eyebrow"]}
            </span>
          )}
          <h1
            className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance"
            {...fieldAttr("default.videos.hero-heading")}
          >
            {f["default.videos.hero-heading"] ?? "Videos"}
          </h1>
          {f["default.videos.hero-tagline"] && (
            <p
              className="mt-4 max-w-[560px] text-[17px] text-[#6b6b6b]"
              {...fieldAttr("default.videos.hero-tagline")}
            >
              {f["default.videos.hero-tagline"]}
            </p>
          )}
        </div>
      </section>

      {/* ── Video grid ───────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("videos", "list")}
        className="px-6 py-16 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          {videos.length === 0 ? (
            <div className="rounded-(--radius) border border-[#e8e8e8] py-24 text-center">
              <p
                className="text-[15px] font-medium text-[#0a0a0a]"
                {...fieldAttr("default.videos.list-empty-heading")}
              >
                {f["default.videos.list-empty-heading"] ?? "No videos yet"}
              </p>
              {f["default.videos.list-empty-body"] && (
                <p
                  className="mt-1 text-sm text-[#6b6b6b]"
                  {...fieldAttr("default.videos.list-empty-body")}
                >
                  {f["default.videos.list-empty-body"]}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => {
                const { title, description, thumbnailUrl } =
                  resolveVideoCopy(video);

                return (
                  <div key={video.id} className="flex flex-col gap-3">
                    <VideoFacade
                      youtubeId={video.youtubeId}
                      title={title}
                      thumbnailUrl={thumbnailUrl}
                    />
                    <div>
                      <h2 className="text-[16px] font-medium tracking-[-0.01em] text-[#0a0a0a]">
                        {title}
                      </h2>
                      {description && (
                        <p className="mt-1 line-clamp-2 text-[14px] text-[#6b6b6b]">
                          {description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
