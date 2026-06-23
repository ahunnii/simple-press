"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "sp_banner_dismissed";

type DismissibleBannerProps = {
  /** The config version string. If localStorage stores this exact value, the banner stays hidden. */
  version: string;
  /**
   * Render-prop: receives the dismiss function so the template can place
   * the dismiss button wherever it wants within its own markup.
   */
  children: (dismiss: () => void) => React.ReactNode;
  className?: string;
};

/**
 * Template-agnostic dismissal wrapper for site-wide announcement banners.
 *
 * Behavior:
 * - Renders nothing until hydrated (avoids SSR mismatch).
 * - If localStorage["sp_banner_dismissed"] === version, stays hidden.
 * - Provides a `dismiss` callback to children; also renders a fallback
 *   dismiss <button> inside the region so keyboard users always have one.
 * - Persists the dismissed version to localStorage on dismiss.
 *
 * Presentation is fully controlled by children. Wrap output in:
 *   <div role="region" aria-label="Announcement">
 */
export function DismissibleBanner({
  version,
  children,
  className,
}: DismissibleBannerProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === version) {
        setIsDismissed(true);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — show the banner
    }
    setIsHydrated(true);
  }, [version]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, version);
    } catch {
      // Storage write failed — still dismiss in-memory
    }
    setIsDismissed(true);
  };

  if (!isHydrated || isDismissed) return null;

  return (
    <div role="region" aria-label="Announcement" className={className}>
      {children(dismiss)}
    </div>
  );
}

/**
 * A ready-made dismiss button for templates that don't need custom placement.
 * Import and render inside the render-prop callback to get the standard X button.
 *
 * Usage:
 *   <DismissibleBanner version={config.version}>
 *     {(dismiss) => (
 *       <div className="relative flex items-center ...">
 *         <p>Your announcement text</p>
 *         <BannerDismissButton dismiss={dismiss} />
 *       </div>
 *     )}
 *   </DismissibleBanner>
 */
export function BannerDismissButton({
  dismiss,
  className,
}: {
  dismiss: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Dismiss announcement"
      onClick={dismiss}
      className={className}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
