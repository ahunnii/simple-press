import type { RouterOutputs } from "~/trpc/react";
import { VideoFacade } from "~/components/video-facade";

export type PinkVideo = RouterOutputs["videos"]["getPublic"][number];

type Props = {
  video: PinkVideo;
  /** Show the posting channel under the title. Off on the homepage teaser. */
  showChannel?: boolean;
  /** Drops the description and steps the title down — used by the homepage strip. */
  compact?: boolean;
  /** `h2` under a page H1, `h3` under a homepage section heading. */
  headingLevel?: "h2" | "h3";
};

/**
 * A `Video` row carries sync-owned columns (rewritten by the 30-minute cron on
 * every run) alongside owner-override columns (written only by the admin UI).
 * Resolution is always `override ?? synced`, so an owner's edits survive the
 * next sync — never render `video.title` / `description` / `thumbnailUrl`
 * directly.
 */
function resolveVideoCopy(video: PinkVideo) {
  return {
    title: video.titleOverride ?? video.title,
    description: video.descriptionOverride ?? video.description,
    thumbnailUrl: video.thumbnailOverride ?? video.thumbnailUrl,
  };
}

/**
 * One published `Video`, on `/videos` and (compact) in the homepage strip.
 *
 * Anatomy is deliberately the event card's: the media, then a meta block hung
 * under the same `1px solid var(--pink-ink)` rule the product and event cards
 * use. No card chrome — the hairline is the anatomy in this template, and a
 * bordered box around a 16:9 thumbnail would read as card-inside-card on the
 * blush wash the homepage strip runs on.
 *
 * Server-safe: `VideoFacade` is the only client boundary, and it owns it. The
 * facade stays a facade until the visitor clicks — a page of twenty videos
 * mounts zero YouTube iframes on load.
 *
 * `.pink * { border-radius: 0 }` in globals.css already squares off the
 * facade's own `rounded-md`, so nothing here has to fight it; the `className`
 * below only re-tones the pre-thumbnail surface into the pink ramp.
 */
export function PinkVideoCard({
  video,
  showChannel = false,
  compact = false,
  headingLevel = "h2",
}: Props) {
  const { title, description, thumbnailUrl } = resolveVideoCopy(video);
  const Heading = headingLevel;

  return (
    <article className="flex h-full flex-col">
      <VideoFacade
        youtubeId={video.youtubeId}
        title={title}
        thumbnailUrl={thumbnailUrl}
        className="bg-[var(--pink-panel-strong)]"
      />

      <div
        className={`flex flex-1 flex-col ${compact ? "mt-3 gap-1.5 pt-3" : "mt-4 gap-2 pt-4"}`}
        style={{ borderTop: "1px solid var(--pink-ink)" }}
      >
        <Heading
          className={`pink-display font-semibold tracking-[-0.015em] ${
            compact
              ? "text-[1.0625rem] leading-[1.25]"
              : "text-[1.25rem] leading-[1.2]"
          }`}
          style={{ color: "var(--pink-ink)" }}
        >
          {title}
        </Heading>

        {/* Some of these clips were filmed and posted by the people who hosted
            her, so the channel is a credit, not a metric. */}
        {showChannel && video.channelTitle && (
          <p className="pink-label truncate">{video.channelTitle}</p>
        )}

        {!compact && description && (
          <p
            className="line-clamp-3 text-[0.9375rem] leading-[1.7]"
            style={{ color: "var(--pink-body)" }}
          >
            {description}
          </p>
        )}
      </div>
    </article>
  );
}
