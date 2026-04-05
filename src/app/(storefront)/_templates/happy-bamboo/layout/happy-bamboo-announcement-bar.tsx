"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

type BambooAnnouncementBarProps = {
  businessId: string;
};

export function HappyBambooAnnouncementBar({
  businessId,
}: BambooAnnouncementBarProps) {
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
      className="border-b border-emerald-900/10 bg-emerald-950/90 px-4 py-2.5 text-center text-sm text-white"
      role="region"
      aria-label="Promotion"
    >
      <p className="mx-auto max-w-4xl leading-relaxed">
        {data.bannerText} {"- Code: "}
        <span className="font-mono font-semibold tracking-wide">
          {data.code}
        </span>
        {isExternal ? (
          <a
            href={href}
            className="ml-2 inline-block font-medium text-emerald-200 underline underline-offset-2 hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Shop now
          </a>
        ) : (
          <Link
            href={href}
            className="ml-2 inline-block font-medium text-emerald-200 underline underline-offset-2 hover:text-white"
          >
            Shop now
          </Link>
        )}
      </p>
    </div>
  );
}
