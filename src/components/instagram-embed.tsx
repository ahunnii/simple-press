"use client";

import { useEffect } from "react";

import { sanitizeInstagramUrl } from "~/lib/embed";

/**
 * Global type declaration for the Instagram embed script injected by
 * https://www.instagram.com/embed.js.
 *
 * May be absent when the script is still loading or has been blocked.
 * All code that calls window.instgrm MUST guard with optional chaining.
 */
declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export {};

// Module-level singleton flag — ensures we only inject the embed.js script
// tag once per page load regardless of how many <InstagramEmbed> instances
// are mounted.
let scriptInjected = false;

type InstagramEmbedProps = {
  /** A URL pointing to an Instagram profile, post, or reel. */
  permalink: string;
  className?: string;
  /**
   * Max width of the card in px. Instagram allows 326–540; values are clamped
   * to that range. Defaults to 540.
   */
  maxWidth?: number;
  /** Horizontal alignment of the card within its container. Defaults to "center". */
  align?: "left" | "center";
  /** When true, wraps the card in a bordered, rounded, shadowed frame. */
  frame?: boolean;
};

// Instagram's embed card is only valid between these widths.
const IG_MIN_WIDTH = 326;
const IG_MAX_WIDTH = 540;

/**
 * Renders Instagram's official embed card for a profile, post, or reel URL.
 *
 * - Sanitises and canonicalises the permalink via `sanitizeInstagramUrl`.
 *   Returns `null` when the URL is invalid or not an Instagram domain.
 * - Renders the official `<blockquote class="instagram-media">` markup that
 *   Instagram's embed.js expects.
 * - Loads https://www.instagram.com/embed.js exactly once per page (singleton),
 *   then calls `window.instgrm.Embeds.process()` to turn the blockquote into a
 *   live iframe. If the script is already loaded when the component mounts (e.g.
 *   on a client-side navigation), `process()` is called directly.
 */
export function InstagramEmbed({
  permalink,
  className,
  maxWidth,
  align = "center",
  frame = false,
}: InstagramEmbedProps) {
  const safeUrl = sanitizeInstagramUrl(permalink);

  // Clamp the requested width into Instagram's supported range.
  const clampedWidth =
    typeof maxWidth === "number" && Number.isFinite(maxWidth)
      ? Math.min(IG_MAX_WIDTH, Math.max(IG_MIN_WIDTH, Math.round(maxWidth)))
      : IG_MAX_WIDTH;

  // Centered: auto both sides. Left: only the right margin auto-collapses.
  const horizontalMargin = align === "left" ? "0 auto 0 0" : "0 auto";

  useEffect(() => {
    if (typeof window === "undefined") return;

    function process() {
      try {
        window.instgrm?.Embeds.process();
      } catch {
        // Never throw — embed processing is advisory only
      }
    }

    // Script already loaded in a previous mount — just re-process.
    if (window.instgrm) {
      process();
      return;
    }

    // Script tag already injected but not yet loaded — the onload handler on
    // the existing tag will call process() when it fires. Nothing more to do.
    if (scriptInjected) return;

    // First mount: inject the script tag.
    scriptInjected = true;
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = process;
    document.body.appendChild(script);
  }, [permalink]);

  if (!safeUrl) return null;

  return (
    <div className={className}>
      <div
        // Wrapper that owns the width, alignment, and optional frame. The
        // blockquote inside is replaced by Instagram's iframe at runtime, so
        // all owner-controlled styling lives here on a node React fully owns.
        style={{
          width: "100%",
          maxWidth: clampedWidth,
          margin: horizontalMargin,
          ...(frame
            ? {
                padding: "clamp(12px, 2vw, 20px)",
                border: "1px solid var(--vii-tan, #e4ddd1)",
                borderRadius: 8,
                background: "#fff",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }
            : {}),
        }}
      >
        <blockquote
          // Keyed on the URL so a changed permalink mounts a fresh node rather
          // than reusing the one Instagram's script has already mutated into an
          // iframe (which would desync React's view of the DOM).
          key={safeUrl}
          className="instagram-media"
          data-instgrm-permalink={safeUrl}
          data-instgrm-version="14"
          style={{
            background: "#FFF",
            border: 0,
            borderRadius: 3,
            // When framed, the wrapper supplies the shadow — drop the card's
            // own so they don't stack into a muddy double shadow.
            boxShadow: frame
              ? "none"
              : "0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)",
            margin: 0,
            maxWidth: "100%",
            minWidth: IG_MIN_WIDTH,
            width: "100%",
          }}
        >
          {/* Fallback shown before embed.js runs, or if it's blocked / JS is
              off. Instagram's script replaces the blockquote contents once it
              processes the embed. */}
          <a href={safeUrl} target="_blank" rel="noopener noreferrer">
            View this content on Instagram
          </a>
        </blockquote>
      </div>
    </div>
  );
}
