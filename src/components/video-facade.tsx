"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

import { EMBED_SANDBOX } from "~/lib/embed";
import { cn } from "~/lib/utils";
import { youtubeEmbedUrl } from "~/lib/youtube/parse";

export type VideoFacadeProps = {
  youtubeId: string;
  title: string;
  /** Sync-provided ytimg URL, or an owner override. May be absent. */
  thumbnailUrl?: string | null;
  className?: string;
};

/**
 * Lightweight "lite-youtube" style facade for video galleries.
 *
 * Renders a static 16:9 thumbnail + play button instead of a live iframe.
 * The real YouTube iframe is only mounted after the visitor clicks, so a
 * gallery of 20+ videos doesn't pay the weight of 20+ embedded players
 * up front.
 *
 * Deliberately does NOT reuse `EmbedFrame` — that component hardcodes
 * `referrerPolicy="no-referrer"`, which is the documented cause of YouTube's
 * "Error 153" player-configuration failure. This component owns its own
 * iframe with the referrer policy YouTube's own embed markup recommends.
 */
export function VideoFacade({
  youtubeId,
  title,
  thumbnailUrl,
  className,
}: VideoFacadeProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    const src = `${youtubeEmbedUrl(youtubeId)}?autoplay=1`;

    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-md bg-black",
          className,
        )}
        style={{ aspectRatio: "16 / 9" }}
      >
        <iframe
          src={src}
          title={title}
          sandbox={EMBED_SANDBOX}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-muted relative w-full overflow-hidden rounded-md",
        className,
      )}
      style={{ aspectRatio: "16 / 9" }}
    >
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="from-muted to-muted-foreground/10 absolute inset-0 bg-gradient-to-br"
        />
      )}

      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play video: ${title}`}
        className={cn(
          "group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3",
          "bg-black/20 transition-colors duration-200 outline-none motion-reduce:transition-none",
          "hover:bg-black/30 focus-visible:bg-black/30",
          "focus-visible:ring-4 focus-visible:ring-white/80 focus-visible:ring-inset",
        )}
      >
        <span
          className={cn(
            "flex size-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg",
            "transition-transform duration-200 motion-reduce:transition-none",
            "group-hover:scale-105 group-focus-visible:scale-105",
          )}
        >
          <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
        </span>
        <span className="line-clamp-2 max-w-[90%] px-2 text-center text-sm font-medium text-white drop-shadow">
          {title}
        </span>
      </button>
    </div>
  );
}
