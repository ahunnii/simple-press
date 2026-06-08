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

  // Side obs #2: replaced inline style={{ color }} with Tailwind classes.
  // coral on the dark announcement bar passes contrast (6.35:1) — no need
  // to switch to coral-aa here.
  const linkClassName =
    "ml-3 inline-flex shrink-0 items-center font-sans text-xs tracking-[0.16em] text-[var(--sl-coral)] uppercase underline underline-offset-[3px] transition-opacity hover:opacity-70";

  return (
    <div className="sl-announcement-bar" role="region" aria-label="Promotion">
      <p className="text-center font-sans text-xs leading-relaxed tracking-[0.12em] uppercase">
        {/* Side obs #2: was style={{ color: "rgba(255,255,255,0.92)" }} */}
        <span className="text-white/[0.92]">{data.bannerText}</span>
        {/* Side obs #2: was style={{ color: "rgba(255,255,255,0.55)" }} */}
        <span className="text-white/55"> · Code: </span>
        {/* Side obs #2: was style={{ color: "var(--sl-coral)" }} */}
        <span className="font-semibold text-[var(--sl-coral)]">{data.code}</span>
        {isExternal ? (
          <a
            href={href}
            className={linkClassName}
            target="_blank"
            rel="noopener noreferrer"
          >
            Shop →
            {/* M-10: warn screen-reader users that the link opens in a new tab */}
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        ) : (
          <Link href={href} className={linkClassName}>
            Shop →
          </Link>
        )}
      </p>
    </div>
  );
}
