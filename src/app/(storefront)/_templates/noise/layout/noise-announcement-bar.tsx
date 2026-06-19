"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

type NoiseAnnouncementBarProps = {
  businessId: string;
};

export function NoiseAnnouncementBar({
  businessId: _,
}: NoiseAnnouncementBarProps) {
  const { data, isLoading } = api.discount.getActiveBanner.useQuery(undefined, {
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return null;
  }

  const rawHref = data.bannerLinkUrl?.trim();
  const href = rawHref && rawHref.length > 0 ? rawHref : "/shop";
  const isExternal = /^https?:\/\//i.test(href);

  return (
    <div
      className="vn-topbar"
      role="region"
      aria-label="Promotion"
      data-announcement-bar
    >
      <p className="font-mono text-[11px] tracking-[0.22em] uppercase">
        {data.bannerText}
        {" · Code: "}
        <span className="font-semibold">{data.code}</span>
      </p>
      {isExternal ? (
        <a
          href={href}
          className="ml-4 font-mono text-[10px] tracking-[0.18em] uppercase underline underline-offset-2 transition-opacity hover:opacity-70"
          target="_blank"
          rel="noopener noreferrer"
        >
          Shop →<span className="sr-only">(opens in new tab)</span>
        </a>
      ) : (
        <Link
          href={href}
          className="ml-4 font-mono text-[10px] tracking-[0.18em] uppercase underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Shop →
        </Link>
      )}
    </div>
  );
}
