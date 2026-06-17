"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

/**
 * ViiAnnouncementBar
 *
 * Two-tier approach:
 *  1. If an active discount banner exists, show it (same pattern as NoiseAnnouncementBar).
 *  2. Otherwise, show the owner-configured announcement text + link that was
 *     pre-resolved server-side in ViiLayout and passed as props.
 *
 * The `announcementText`, `announcementLinkText`, and `announcementLinkHref`
 * props let the layout pass already-resolved field values rather than making
 * an additional client-side tRPC call.
 */
type ViiAnnouncementBarProps = {
  businessId: string;
  announcementText?: string;
  announcementLinkText?: string;
  announcementLinkHref?: string;
};

const barStyle: React.CSSProperties = {
  background: "var(--vii-navy)",
  color: "var(--vii-cream)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  padding: "10px 16px",
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
};

export function ViiAnnouncementBar({
  businessId: _,
  announcementText,
  announcementLinkText = "Learn More",
  announcementLinkHref = "/contact",
}: ViiAnnouncementBarProps) {
  const { data: discountBanner, isLoading } = api.discount.getActiveBanner.useQuery(
    undefined,
    { staleTime: 60_000 },
  );

  // While discount query resolves, render nothing to avoid flash.
  // (If there's announcement text we could show it immediately, but waiting a
  // tick avoids layout shift from the discount banner potentially replacing it.)
  if (isLoading) return null;

  // ── Priority 1: active discount banner ─────────────────────────────────────
  if (discountBanner) {
    const rawHref = discountBanner.bannerLinkUrl?.trim();
    const href = rawHref && rawHref.length > 0 ? rawHref : "/shop";
    const isExternal = /^https?:\/\//i.test(href);

    return (
      <div
        className="vii-announcement-bar"
        role="region"
        aria-label="Promotion"
        data-announcement-bar
        style={barStyle}
      >
        <span>
          {discountBanner.bannerText}
          {" · Code: "}
          <strong>{discountBanner.code}</strong>
        </span>
        {isExternal ? (
          <a href={href} style={linkStyle} target="_blank" rel="noopener noreferrer">
            Shop →<span className="sr-only">(opens in new tab)</span>
          </a>
        ) : (
          <Link href={href} style={linkStyle}>
            Shop →
          </Link>
        )}
      </div>
    );
  }

  // ── Priority 2: owner-configured announcement text ─────────────────────────
  if (!announcementText) return null;

  const isExternal = /^https?:\/\//i.test(announcementLinkHref);

  return (
    <div
      className="vii-announcement-bar"
      role="region"
      aria-label="Announcement"
      data-announcement-bar
      style={barStyle}
    >
      <span>{announcementText}</span>
      {isExternal ? (
        <a href={announcementLinkHref} style={linkStyle} target="_blank" rel="noopener noreferrer">
          {announcementLinkText} →<span className="sr-only">(opens in new tab)</span>
        </a>
      ) : (
        <Link href={announcementLinkHref} style={linkStyle}>
          {announcementLinkText} →
        </Link>
      )}
    </div>
  );
}
