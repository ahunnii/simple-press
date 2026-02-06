import { type Metadata } from "next";
import { Geist } from "next/font/google";
import "~/styles/globals.css";

import { TooltipProvider } from "~/components/ui/tooltip";

import Script from "next/script";
import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";
import { Providers } from "./_components/providers/providers";

export const metadata: Metadata = {
  title: {
    template: "%s - Crossroads Community Association",
    default: "Crossroads Community Association",
  },
  description: "GBuilding a Safer, Stronger Community Together.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

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
