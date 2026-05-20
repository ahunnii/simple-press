"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

type NoiseAnnouncementBarProps = {
  businessId: string;
};

export function NoiseAnnouncementBar({ businessId: _ }: NoiseAnnouncementBarProps) {
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
      className="vn-topbar flex items-center justify-center gap-3"
      role="region"
      aria-label="Promotion"
    >
      <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase">
        {data.bannerText}
        {" — Code: "}
        <span className="font-semibold tracking-wide">{data.code}</span>
      </p>
      {isExternal ? (
        <a
          href={href}
          className="vn-stamp vn-stamp-solid text-[9px] hover:opacity-80 transition-opacity"
          target="_blank"
          rel="noopener noreferrer"
        >
          Shop now →
        </a>
      ) : (
        <Link
          href={href}
          className="vn-stamp vn-stamp-solid text-[9px] hover:opacity-80 transition-opacity"
        >
          Shop now →
        </Link>
      )}
    </div>
  );
}
