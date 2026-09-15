"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type OliveAnnouncementBarProps = {
  banner: BannerConfig;
};

/**
 * The thin strip above the header: white ground, one hairline below, ink-soft
 * uppercase text at 0.6875rem. Deliberately the quietest thing on the page —
 * the photographs do the talking, so the bar reads as printed card stock
 * rather than a coloured ribbon.
 *
 * Wired to the shared banner system (`resolveBanner` in the layout +
 * `DismissibleBanner` here); the caller renders this only when a banner
 * actually resolved, so "no banner configured" renders nothing at all.
 * An owner who sets explicit banner colours overrides the ground and ink.
 */
export function OliveAnnouncementBar({ banner }: OliveAnnouncementBarProps) {
  const isExternal = banner.linkUrl
    ? /^https?:\/\//i.test(banner.linkUrl)
    : false;

  const barStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    alignItems: "center",
    gap: "12px",
    minHeight: "36px",
    padding: "9px 12px 9px 16px",
    ...(banner.bgColor ? { background: banner.bgColor } : {}),
    ...(banner.textColor ? { color: banner.textColor } : {}),
  };

  const linkStyle: React.CSSProperties = {
    color: banner.textColor ?? "var(--olive-leaf)",
    textDecoration: "underline",
    textUnderlineOffset: "4px",
    letterSpacing: "0.14em",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="olive-announcement-bar"
          data-announcement-bar
          style={barStyle}
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
                {banner.linkLabel ?? "Learn more"}
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link href={banner.linkUrl} style={linkStyle}>
                {banner.linkLabel ?? "Learn more"}
              </Link>
            )
          ) : (
            <span />
          )}

          <BannerDismissButton
            dismiss={dismiss}
            className="flex items-center justify-center rounded-full p-1.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
