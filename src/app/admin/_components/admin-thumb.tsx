"use client";

import { useState } from "react";

export type AdminThumbProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt"
> & {
  src: string;
  alt: string;
};

const FALLBACK_SRC = "/placeholder.svg";

/**
 * `<img>` for admin list/detail thumbnails, with a broken-image fallback.
 * Admin thumbnails render arbitrary S3 URLs — owner uploads, WooCommerce/
 * WordPress imports, hand-edited rows — any of which can 404. Plain `<img>`
 * left those as the browser's broken-image icon; this swaps to
 * `/placeholder.svg` (the platform's existing "no image" asset) on error.
 *
 * Loop-safe: `failedSrc` remembers the exact URL that failed. If the
 * fallback itself fails to load, `src` is already `/placeholder.svg`, which
 * still equals `failedSrc` from the first failure, so the handler no-ops
 * instead of retrying forever. Passing a new, different `src` (e.g. after a
 * re-upload) no longer matches `failedSrc`, so it recovers automatically —
 * no effect or explicit reset needed.
 *
 * Storefront pages must NOT use this: there `/placeholder.svg` is a "no
 * image" sentinel that hides whole sections, and folding "broken" into that
 * meaning would hide sections that should render. Admin-only.
 */
export function AdminThumb({ src, alt, onError, ...rest }: AdminThumbProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = failedSrc === src;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails render arbitrary S3 URLs at small fixed sizes; next/image's loader machinery buys nothing at this size and adds a remote-pattern config burden. Centralized here so adopting call sites don't need their own disable comment.
    <img
      src={showFallback ? FALLBACK_SRC : src}
      alt={alt}
      onError={(event) => {
        // Already showing the fallback — a second failure means the
        // fallback asset itself is missing. Don't re-trigger.
        if (showFallback) return;
        setFailedSrc(src);
        onError?.(event);
      }}
      {...rest}
    />
  );
}
