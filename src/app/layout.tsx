import { Geist } from "next/font/google";

import "~/styles/globals.css";

import Script from "next/script";

import { env } from "~/env";
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
    openGraph: {
      title: business.siteContent?.metaTitle ?? business.name,
      description: business.siteContent?.metaDescription ?? "",

      images: [
        business.siteContent?.ogImage ??
          business.siteContent?.logoUrl ??
          "/placeholder.svg",
      ],
      url:
        business?.customDomain && business.domainStatus === "ACTIVE"
          ? `https://${business.customDomain}`
          : `https://${business.subdomain}.${process.env.NEXT_PUBLIC_DOMAIN}`,
    },
    icons: [
      { rel: "icon", url: business.siteContent?.faviconUrl ?? "/favicon.ico" },
    ],
  };
}

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <Providers>
          {env.NEXT_PUBLIC_ENABLE_UMAMI && (
            <Script
              defer
              src="/umami.js"
              data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            />
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
