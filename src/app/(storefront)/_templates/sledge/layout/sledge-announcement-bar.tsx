"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

type SledgeAnnouncementBarProps = {
  businessId: string;
};

export function SledgeAnnouncementBar({
  businessId: _,
}: SledgeAnnouncementBarProps) {
  const { data, isLoading } = api.discount.getActiveBanner.useQuery(undefined, {
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return null;
  }

  const rawHref = data.bannerLinkUrl?.trim();
  const href = rawHref && rawHref.length > 0 ? rawHref : "/shop";
  const isExternal = /^https?:\/\//i.test(href);

  const linkClassName =
    "ml-3 inline-flex shrink-0 items-center font-sans text-xs tracking-[0.16em] uppercase underline underline-offset-[3px] transition-opacity hover:opacity-70";

  return (
    <div className="sl-announcement-bar" role="region" aria-label="Promotion">
      <p className="text-center font-sans text-xs leading-relaxed tracking-[0.12em] uppercase">
        <span style={{ color: "rgba(255,255,255,0.92)" }}>
          {data.bannerText}
        </span>
        <span style={{ color: "rgba(255,255,255,0.55)" }}> · Code: </span>
        <span className="font-semibold" style={{ color: "var(--sl-coral)" }}>
          {data.code}
        </span>
        {isExternal ? (
          <a
            href={href}
            className={linkClassName}
            style={{ color: "var(--sl-coral)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Shop →
          </a>
        ) : (
          <Link
            href={href}
            className={linkClassName}
            style={{ color: "var(--sl-coral)" }}
          >
            Shop →
          </Link>
        )}
      </p>
    </div>
  );
}
