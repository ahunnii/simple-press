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
      className="border-b border-foreground/10 bg-foreground px-4 py-2 text-center text-xs text-background"
      role="region"
      aria-label="Promotion"
    >
      <p className="mx-auto max-w-4xl tracking-widest uppercase">
        {data.bannerText}{" — Code: "}
        <span className="font-mono font-semibold tracking-wide">
          {data.code}
        </span>
        {isExternal ? (
          <a
            href={href}
            className="ml-3 inline-block font-medium underline underline-offset-2 opacity-70 hover:opacity-100"
            target="_blank"
            rel="noopener noreferrer"
          >
            Shop now
          </a>
        ) : (
          <Link
            href={href}
            className="ml-3 inline-block font-medium underline underline-offset-2 opacity-70 hover:opacity-100"
          >
            Shop now
          </Link>
        )}
      </p>
    </div>
  );
}
