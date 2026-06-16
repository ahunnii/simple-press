import { Geist } from "next/font/google";

import "~/styles/globals.css";

import type { Metadata } from "next";
import Script from "next/script";

import { env } from "~/env";
import { getCanonicalBaseUrl } from "~/lib/canonical";
import { checkBusiness } from "~/lib/check-business";
import { TRPCReactProvider } from "~/trpc/react";
import { api } from "~/trpc/server";
import { TooltipProvider } from "~/components/ui/tooltip";
import { TemplateSelectorDevTool } from "~/components/development/template-selector";

import { Providers } from "../providers/providers";

export async function generateMetadata() {
  const business = await api.business.simplifiedGet();
  if (!business) {
    return {
      title: "Simple Press",
      description: "The simplest way to get started with your online business.",
      icons: [{ rel: "icon", url: "/favicon.ico" }],
    };
  }
  const canonicalBase = getCanonicalBaseUrl(business);
  const ogTitle = business.siteContent?.metaTitle ?? business.name;
  const ogDescription = business.siteContent?.metaDescription ?? "";
  const ogImage =
    business.siteContent?.ogImage ??
    business.siteContent?.logoUrl ??
    "/placeholder.svg";

  return {
    title: {
      template: `%s | ${business.name}`,
      default: business.siteContent?.metaTitle ?? business.name,
    },
    description:
      business.siteContent?.metaDescription ??
      "The simplest way to get started with your online business.",
    keywords:
      business.siteContent?.metaKeywords
        ?.split(",")
        .map((keyword: string) => keyword.trim()) ?? [],
    alternates: {
      canonical: canonicalBase,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
      url: canonicalBase,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
    icons: [
      { rel: "icon", url: business.siteContent?.faviconUrl ?? "/favicon.ico" },
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
