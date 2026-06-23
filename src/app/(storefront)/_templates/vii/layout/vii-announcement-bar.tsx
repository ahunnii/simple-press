"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type ViiAnnouncementBarProps = {
  banner: BannerConfig;
};

const barBaseStyle: React.CSSProperties = {
  background: "var(--vii-navy)",
  color: "var(--vii-cream)",
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px 10px 16px",
  minHeight: "38px",
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const linkStyle: React.CSSProperties = {
  color: "var(--vii-copper-light)",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  fontSize: "11px",
  letterSpacing: "0.14em",
  transition: "opacity 0.2s",
  flexShrink: 0,
  whiteSpace: "nowrap",
};

export function ViiAnnouncementBar({ banner }: ViiAnnouncementBarProps) {
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
        <div
          className="vii-announcement-bar"
          data-announcement-bar
          style={inlineStyle}
        >
          {/* Rich-text message — center column spans leftward */}
          <div className="text-center">
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
                {banner.linkLabel ?? "Learn More"} →
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link href={banner.linkUrl} style={resolvedLinkStyle}>
                {banner.linkLabel ?? "Learn More"} →
              </Link>
            )
          ) : (
            <span />
          )}

          {/* Dismiss button — right edge */}
          <BannerDismissButton
            dismiss={dismiss}
            className="flex items-center justify-center rounded p-1.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
