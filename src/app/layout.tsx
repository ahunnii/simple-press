import { Geist } from "next/font/google";

import "~/styles/globals.css";

import type { Metadata } from "next";
import Script from "next/script";

import { env } from "~/env";
import { getCanonicalBaseUrl } from "~/lib/canonical";
import { checkBusiness } from "~/lib/check-business";
import { getCachedBusiness } from "~/lib/seo";
import { firstNonBlank } from "~/lib/seo/blank";
import { renderSeoTitle, resolveSeoBrand } from "~/lib/seo/title";
import { parseSiteVerification } from "~/lib/validators/site-seo";
import { TRPCReactProvider } from "~/trpc/react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { TemplateSelectorDevTool } from "~/components/development/template-selector";

import { Providers } from "../providers/providers";

export async function generateMetadata() {
  const business = await getCachedBusiness();
  if (!business) {
    return {
      title: "SimplePress",
      description: "The simplest way to get started with your online business.",
      icons: [{ rel: "icon", url: "/favicon.ico" }],
    };
  }
  const canonicalBase = getCanonicalBaseUrl(business);

  // The brand suffix every `<title>` carries — `seoBrandName` when the owner
  // has set a short form, else the business name. See `~/lib/seo/title`.
  const brand = resolveSeoBrand(business);

  // Un-suffixed: `og:site_name` already carries the brand, so repeating it in
  // `og:title` just burns characters in every share card.
  const ogTitle =
    firstNonBlank(business.siteContent?.metaTitle) ?? business.name;
  const ogDescription = firstNonBlank(business.siteContent?.metaDescription);
  // No `/placeholder.svg` fallback: a share card with a real image or none at
  // all beats one advertising a missing asset.
  const ogImage = firstNonBlank(
    business.siteContent?.ogImage,
    business.siteContent?.logoUrl,
  );

  // Search-engine ownership tokens. Emit a key only when the owner has actually
  // saved that token — an empty `<meta>` is worse than no tag at all, since
  // Google reads a blank content attribute as a failed verification.
  const verification = parseSiteVerification(
    business.siteContent?.siteVerification,
  );
  const verificationTags: NonNullable<Metadata["verification"]> = {
    ...(verification.google !== undefined
      ? { google: verification.google }
      : {}),
    ...(verification.bing !== undefined
      ? { other: { "msvalidate.01": verification.bing } }
      : {}),
  };

  return {
    metadataBase: new URL(canonicalBase),
    title: {
      // Fallback for any route that doesn't go through `buildPageMetadata`;
      // that helper ships `{ absolute }` and applies the same suffix itself.
      template: `%s | ${brand}`,
      // `renderSeoTitle` drops the suffix when the title already contains the
      // brand, so a store with no `metaTitle` and no `seoBrandName` gets a
      // homepage title of just its name rather than "Name | Name".
      default: renderSeoTitle(ogTitle, brand),
    },
    description:
      firstNonBlank(business.siteContent?.metaDescription) ??
      "The simplest way to get started with your online business.",
    keywords:
      business.siteContent?.metaKeywords
        ?.split(",")
        .map((keyword: string) => keyword.trim()) ?? [],
    alternates: {
      canonical: canonicalBase,
    },
    openGraph: {
      type: "website",
      title: ogTitle,
      siteName: business.name,
      // Omitted rather than emitted blank — an empty `og:description` is worse
      // than none, since scrapers prefer a present-but-empty tag over the
      // page's own text.
      ...(ogDescription !== undefined ? { description: ogDescription } : {}),
      ...(ogImage !== undefined
        ? {
            images: [
              { url: ogImage, width: 1200, height: 630, alt: business.name },
            ],
          }
        : {}),
      url: canonicalBase,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      ...(ogDescription !== undefined ? { description: ogDescription } : {}),
      ...(ogImage !== undefined ? { images: [ogImage] } : {}),
    },
    ...(Object.keys(verificationTags).length > 0
      ? { verification: verificationTags }
      : {}),
    icons: [
      // Not `??`: the branding form can persist an empty string here
      // (Reset → Save), and an empty href must still fall back to the default.
      {
        rel: "icon",
        url: business.siteContent?.faviconUrl?.trim()
          ? business.siteContent.faviconUrl
          : "/favicon.ico",
      },
    ],
  } as Metadata;
}

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const business = await checkBusiness();

  // Decide which Umami website ID (if any) to inject.
  let umamiWebsiteId: string | undefined;
  if (business) {
    // Tenant storefront: track only when the store has explicitly opted in.
    // No fallback to the platform ID — un-opted-in stores are never tracked.
    if (business.umamiEnabled && business.umamiWebsiteId) {
      umamiWebsiteId = business.umamiWebsiteId;
    }
  } else if (env.NEXT_PUBLIC_ENABLE_UMAMI) {
    // Platform's own pages (no tenant): gated by NEXT_PUBLIC_ENABLE_UMAMI,
    // which now serves only as the platform-pages master switch.
    umamiWebsiteId = env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  }

  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <Providers>
          {umamiWebsiteId && (
            <Script defer src="/umami.js" data-website-id={umamiWebsiteId} />
          )}
          <TooltipProvider>
            <TRPCReactProvider>
              {children} <TemplateSelectorDevTool />
            </TRPCReactProvider>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
