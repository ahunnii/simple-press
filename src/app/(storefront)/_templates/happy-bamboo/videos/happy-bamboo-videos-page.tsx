import { PlayCircle } from "lucide-react";

import type { DefaultVideosPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { VideoFacade } from "~/components/video-facade";

// Default's resolver: this page keeps reading the existing `default.videos.*`
// keys, and Default's field map owns their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { HappyBambooPageShelf } from "../shared/happy-bamboo-page-shelf";

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
 * `/videos` — happy-bamboo's video gallery on the shared page shelf
 * (eyebrow → leaf badge, heading → h1, tagline → intro), with Default's
 * videos page's data logic: `resolveVideoCopy` override precedence,
 * `VideoFacade` per video (no iframe until clicked), and the empty state.
 * The grid sits in the shelf's container. Ends at content.
 */
export function HappyBambooVideosPage({
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

  // `resolveFields` returns "" for a cleared key, so fallbacks test for blank.
  const heading = (f["default.videos.hero-heading"] ?? "").trim() || "Videos";
  const emptyHeading =
    (f["default.videos.list-empty-heading"] ?? "").trim() || "No videos yet";
  const emptyBody = f["default.videos.list-empty-body"] ?? "";

  return (
    <PageTransition>
      <HappyBambooPageShelf
        title={heading}
        titleFieldKey="default.videos.hero-heading"
        smallLabel={f["default.videos.hero-eyebrow"]}
        smallLabelFieldKey="default.videos.hero-eyebrow"
        subtitle={f["default.videos.hero-tagline"]}
        subtitleFieldKey="default.videos.hero-tagline"
        sectionAttrs={sectionGroupAttr("videos", "hero")}
      />

      {/* Video grid */}
      <section
        className="py-16 md:py-24"
        {...sectionGroupAttr("videos", "list")}
      >
        <div className="container mx-auto px-4">
          {videos.length === 0 ? (
            <FadeIn>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <PlayCircle
                  className="text-muted-foreground/50 mb-4 h-12 w-12"
                  aria-hidden="true"
                />
                <p
                  className="text-muted-foreground text-lg"
                  {...fieldAttr("default.videos.list-empty-heading")}
                >
                  {emptyHeading}
                </p>
                {!!emptyBody && (
                  <p
                    className="text-muted-foreground mt-2 text-sm"
                    {...fieldAttr("default.videos.list-empty-body")}
                  >
                    {emptyBody}
                  </p>
                )}
              </div>
            </FadeIn>
          ) : (
            <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => {
                const { title, description, thumbnailUrl } =
                  resolveVideoCopy(video);

                return (
                  <StaggerItem key={video.id} className="h-full">
                    <article className="border-border bg-card flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow duration-300 hover:shadow-xl">
                      <VideoFacade
                        youtubeId={video.youtubeId}
                        title={title}
                        thumbnailUrl={thumbnailUrl}
                        className="rounded-none"
                      />
                      <div className="flex flex-1 flex-col p-6">
                        <h2 className="text-xl font-bold break-words">
                          {title}
                        </h2>
                        {description && (
                          <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">
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
