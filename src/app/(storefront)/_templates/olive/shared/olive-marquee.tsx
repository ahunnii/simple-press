"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "~/lib/utils";

type OliveMarqueeProps = {
  /** One pass of the row. Duplicated internally so the loop is seamless. */
  children: ReactNode;
  /** Names the strip, e.g. "Press coverage". Required — it is a landmark of sorts. */
  "aria-label": string;
  /** Seconds for one full pass. Defaults to the chrome's 34s. */
  speed?: number;
  /** Offer the pause control. Default true — leave it on. */
  pausable?: boolean;
  className?: string;
};

/**
 * OliveMarquee — the press strip.
 *
 * Composes the chrome's `olive-marquee` / `olive-marquee-track`, which mask
 * the ends, pause on hover and focus, and collapse to a wrapped, static,
 * horizontally scrollable row under reduced motion. The duplicate pass exists
 * only so the loop has no seam, so it is hidden from assistive tech and made
 * `inert` — otherwise every logo would be announced and tabbed through twice.
 *
 * The pause button is not decoration: content that moves by itself for more
 * than five seconds needs a way to stop it (WCAG 2.2.2), and hover alone does
 * not count on a touch screen or for a keyboard.
 */
export function OliveMarquee({
  children,
  "aria-label": ariaLabel,
  speed,
  pausable = true,
  className,
}: OliveMarqueeProps) {
  const [paused, setPaused] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div className="olive-marquee" role="group" aria-label={ariaLabel}>
        <div
          className="olive-marquee-track"
          style={{
            animationDuration: speed !== undefined ? `${speed}s` : undefined,
            animationPlayState: paused ? "paused" : undefined,
          }}
        >
          {children}
          <div aria-hidden="true" inert className="contents">
            {children}
          </div>
        </div>
      </div>

      {pausable ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="olive-icon-btn"
            aria-pressed={paused}
            aria-label={paused ? "Resume the strip" : "Pause the strip"}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? (
              <Play aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Pause aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
