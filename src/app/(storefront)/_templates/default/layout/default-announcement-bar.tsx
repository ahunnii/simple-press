"use client";

import Link from "next/link";

import type { BannerConfig } from "~/lib/validators/site-banner";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";

type DefaultAnnouncementBarProps = {
  banner: BannerConfig;
};

const barBaseStyle: React.CSSProperties = {
  background: "#0a0a0a",
  color: "#ffffff",
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px 10px 20px",
  minHeight: "40px",
  fontSize: "13px",
  letterSpacing: "0.01em",
  lineHeight: 1.4,
};

const linkStyle: React.CSSProperties = {
  color: "inherit",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  fontSize: "13px",
  fontWeight: 500,
  transition: "opacity 0.15s",
  flexShrink: 0,
  whiteSpace: "nowrap",
  opacity: 0.85,
};

export function DefaultAnnouncementBar({ banner }: DefaultAnnouncementBarProps) {
  const isExternal = banner.linkUrl
    ? /^https?:\/\//i.test(banner.linkUrl)
    : false;

  const inlineStyle: React.CSSProperties = {
    ...barBaseStyle,
    ...(banner.bgColor ? { background: banner.bgColor } : {}),
    ...(banner.textColor ? { color: banner.textColor } : {}),
  };

  const resolvedLinkStyle: React.CSSProperties = {
    ...linkStyle,
    ...(banner.textColor ? { color: banner.textColor } : {}),
  };

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div data-announcement-bar style={inlineStyle}>
          {/* Rich-text message */}
          <div className="text-center text-sm">
            {banner.content !== null && (
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="[&_p]:m-0"
              />
            )}
          </div>

          {/* Optional link */}
          {banner.linkUrl ? (
            isExternal ? (
              <a
                href={banner.linkUrl}
                style={resolvedLinkStyle}
                target="_blank"
                rel="noreferrer"
              >
                {banner.linkLabel ?? "Learn more"} →
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link href={banner.linkUrl} style={resolvedLinkStyle}>
                {banner.linkLabel ?? "Learn more"} →
              </Link>
            )
          ) : (
            <span />
          )}

          {/* Dismiss button */}
          <BannerDismissButton
            dismiss={dismiss}
            className="flex items-center justify-center rounded p-1.5 opacity-50 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
