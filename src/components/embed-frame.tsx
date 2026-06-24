"use client";

import { useEffect, useRef, useState } from "react";

import { Loader2 } from "lucide-react";

import { Skeleton } from "~/components/ui/skeleton";
import {
  DEFAULT_EMBED_HEIGHT,
  EMBED_SANDBOX,
  isVideoEmbed,
  sanitizeEmbedSrc,
} from "~/lib/embed";
import { ANALYTICS_EVENTS, track } from "~/lib/umami/track";
import { cn } from "~/lib/utils";

/**
 * Maximum dwell time (seconds) we'll record per engagement session.
 * Anything above this cap is likely a browser-tab switch rather than
 * genuine embed engagement, so we discard it to limit noise.
 */
const DWELL_CAP_SECONDS = 1800; // 30 minutes

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
 *
 * Engagement tracking:
 * - When the window loses focus and `document.activeElement` is this iframe,
 *   the visitor clicked into the frame → fires `embed-engaged`.
 * - When the window regains focus, approximate dwell time is computed and
 *   fires `embed-engaged-time` (labeled approximate in the dashboard — tab
 *   switching also triggers window blur, so values can over-count).
 * - Both listeners no-op when Umami is not loaded or tracking is disabled.
 */
export function EmbedFrame({ src, height, title, className }: EmbedFrameProps) {
  const safeSrc = sanitizeEmbedSrc(src);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Timestamp (ms) when the user last clicked into this frame; null when idle.
    let engagedAt: number | null = null;

    function handleBlur() {
      try {
        if (document.activeElement === iframeRef.current) {
          engagedAt = Date.now();
          track(ANALYTICS_EVENTS.EMBED_ENGAGED, { title, src });
        }
      } catch {
        // Never throw — tracking is advisory only
      }
    }

    function handleFocus() {
      try {
        if (engagedAt !== null) {
          const seconds = Math.round((Date.now() - engagedAt) / 1000);
          engagedAt = null;
          if (seconds > 0 && seconds < DWELL_CAP_SECONDS) {
            track(ANALYTICS_EVENTS.EMBED_ENGAGED_TIME, { title, seconds });
          }
        }
      } catch {
        // Never throw — tracking is advisory only
      }
    }

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [title, src]);

  if (!safeSrc) return null;

  const loadingOverlay = !loaded && (
    <>
      <Skeleton className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    </>
  );

  if (isVideoEmbed(safeSrc)) {
    return (
      <div className={cn("relative aspect-video w-full", className)}>
        {loadingOverlay}
        <iframe
          ref={iframeRef}
          src={safeSrc}
          title={title}
          sandbox={EMBED_SANDBOX}
          referrerPolicy="no-referrer"
          loading="lazy"
          data-embed-title={title}
          onLoad={() => setLoaded(true)}
          className={cn(
            "absolute inset-0 h-full w-full border-0 transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative w-full", className)}
      style={{ height: height ?? DEFAULT_EMBED_HEIGHT }}
    >
      {loadingOverlay}
      <iframe
        ref={iframeRef}
        src={safeSrc}
        title={title}
        sandbox={EMBED_SANDBOX}
        referrerPolicy="no-referrer"
        loading="lazy"
        data-embed-title={title}
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full border-0 transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
