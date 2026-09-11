"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type WealthAnnouncementBarProps = {
  banner: BannerConfig;
};

/**
 * Thin primary-green bar, white Titillium text, dismissible. Structurally
 * copied from `vii/layout/vii-announcement-bar.tsx`'s `resolveBanner` +
 * dismissal pattern; hidden entirely when no banner is configured (handled
 * by the caller only rendering this when `resolveBanner(...)` is non-null).
 */
export function WealthAnnouncementBar({ banner }: WealthAnnouncementBarProps) {
  const isExternal = banner.linkUrl
    ? /^https?:\/\//i.test(banner.linkUrl)
    : false;

  const baseStyle: React.CSSProperties = {
    background: "var(--wealth-primary)",
    color: "var(--wealth-paper)",
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    alignItems: "center",
    gap: "12px",
    padding: "8px 12px 8px 16px",
    minHeight: "34px",
    fontFamily: "var(--font-wealth-body)",
    fontSize: "13px",
  };

  const inlineStyle: React.CSSProperties = {
    ...baseStyle,
    ...(banner.bgColor ? { background: banner.bgColor } : {}),
    ...(banner.textColor ? { color: banner.textColor } : {}),
  };

  const linkStyle: React.CSSProperties = {
    color: banner.textColor ?? "var(--wealth-paper)",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    fontSize: "12px",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="wealth-announcement-bar"
          data-announcement-bar
          style={inlineStyle}
        >
          <div className="text-center">
            {banner.content !== null && (
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="[&_p]:m-0"
              />
            )}
          </div>

          {banner.linkUrl ? (
            isExternal ? (
              <a
                href={banner.linkUrl}
                style={linkStyle}
                target="_blank"
                rel="noreferrer"
              >
                {banner.linkLabel ?? "Learn More"}
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link href={banner.linkUrl} style={linkStyle}>
                {banner.linkLabel ?? "Learn More"}
              </Link>
            )
          ) : (
            <span />
          )}

          <BannerDismissButton
            dismiss={dismiss}
            className="flex items-center justify-center rounded p-1.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
