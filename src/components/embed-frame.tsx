"use client";

import {
  DEFAULT_EMBED_HEIGHT,
  EMBED_SANDBOX,
  isVideoEmbed,
  sanitizeEmbedSrc,
} from "~/lib/embed";
import { cn } from "~/lib/utils";

type EmbedFrameProps = {
  src: string;
  height?: number;
  title: string;
  className?: string;
};

/**
 * Renders a sandboxed iframe for arbitrary embeds or video players.
 *
 * - Video hosts (YouTube, Vimeo, etc.) get a responsive `aspect-video` wrapper.
 * - All other embeds use a fixed pixel height (defaults to `DEFAULT_EMBED_HEIGHT`).
 * - Returns `null` when `src` fails HTTPS validation.
 */
export function EmbedFrame({ src, height, title, className }: EmbedFrameProps) {
  const safeSrc = sanitizeEmbedSrc(src);
  if (!safeSrc) return null;

  if (isVideoEmbed(safeSrc)) {
    return (
      <div className={cn("relative aspect-video w-full", className)}>
        <iframe
          src={safeSrc}
          title={title}
          sandbox={EMBED_SANDBOX}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <iframe
      src={safeSrc}
      title={title}
      sandbox={EMBED_SANDBOX}
      referrerPolicy="no-referrer"
      loading="lazy"
      className={cn("w-full border-0", className)}
      style={{ height: height ?? DEFAULT_EMBED_HEIGHT }}
    />
  );
}
