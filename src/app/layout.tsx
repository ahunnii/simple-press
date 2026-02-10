import { type Metadata } from "next";
import { Geist } from "next/font/google";

import "~/styles/globals.css";

import Script from "next/script";

import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";
import { api } from "~/trpc/server";
import { TooltipProvider } from "~/components/ui/tooltip";

import { Providers } from "../providers/providers";

export async function generateMetadata() {
  const business = await api.business.get();
  if (!business) {
    return {
      title: "Simple Press",
      description: "Building a Safer, Stronger Community Together.",
      icons: [{ rel: "icon", url: "/favicon.ico" }],
    };
  }
  return {
    title: {
      template: `%s - ${business.name}`,
      default: business.name,
    },
    description: "Building a Safer, Stronger Community Together.",
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
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
