"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type ElegantAnnouncementBarProps = {
  banner: BannerConfig;
};

/**
 * ElegantAnnouncementBar — a thin ink strip above the floating pill header.
 *
 * Content, link and dismissal come from the merchant's banner config
 * (`siteContent.bannerConfig`, resolved server-side by `resolveBanner`), the
 * same source every template's bar reads — not from template fields.
 * Owner-picked bgColor/textColor win over the elegant tint when set.
 *
 * It renders in normal flow at the top of the layout; the header shell is a
 * zero-height sticky element directly after it, so the pill sits below the
 * bar at the top of the page and pins to the viewport once scrolled past.
 */
export function ElegantAnnouncementBar({
  banner,
}: ElegantAnnouncementBarProps) {
  const linkUrl = banner.linkUrl?.trim() ?? "";
  const trimmedLabel = banner.linkLabel?.trim();
  const linkLabel =
    trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : "Shop now";
  const isExternal = /^https?:\/\//i.test(linkUrl);

  const linkClass =
    "ml-3 inline-block underline underline-offset-4 opacity-90 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="relative px-12 py-2.5 text-center"
          style={{
            background: "var(--el-ink, #1c1a17)",
            color: "var(--el-paper, #fbf8f2)",
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            lineHeight: 1.6,
            ...(banner.bgColor ? { background: banner.bgColor } : {}),
            ...(banner.textColor ? { color: banner.textColor } : {}),
          }}
        >
          <div className="mx-auto max-w-4xl">
            {banner.content != null && (
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="inline [&_p]:inline"
              />
            )}
            {linkUrl &&
              (isExternal ? (
                <a
                  href={linkUrl}
                  className={linkClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkLabel}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              ) : (
                <Link href={linkUrl} className={linkClass}>
                  {linkLabel}
                </Link>
              ))}
          </div>
          <BannerDismissButton
            dismiss={dismiss}
            className="absolute top-1/2 right-3 -translate-y-1/2 opacity-70 transition-opacity hover:opacity-100"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
