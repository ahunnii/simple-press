import type { Metadata } from "next";

import { getCanonicalUrl } from "~/lib/canonical";

interface CanonicalBusiness {
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
}

interface BuildPageMetadataArgs {
  business: CanonicalBusiness | null | undefined;
  path: string;             // e.g. "/shop"
  title: string;
  description?: string | null;
  keywords?: string | null; // comma-separated string
  ogImage?: string | null;
  noindex?: boolean;
}

export function buildPageMetadata({
  business,
  path,
  title,
  description,
  keywords,
  ogImage,
  noindex,
}: BuildPageMetadataArgs): Metadata {
  const desc = description ?? undefined;
  const parsedKeywords = keywords
    ? keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined;
  const images = ogImage ? [ogImage] : undefined;

  return {
    title,
    ...(desc !== undefined ? { description: desc } : {}),
    ...(parsedKeywords !== undefined ? { keywords: parsedKeywords } : {}),
    ...(business != null
      ? { alternates: { canonical: getCanonicalUrl(business, path) } }
      : {}),
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description: desc ?? "",
      ...(images !== undefined ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description: desc ?? "",
      ...(images !== undefined ? { images } : {}),
    },
  };
}
