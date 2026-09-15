"use server";

import { Figtree, Josefin_Sans } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import type { OliveNavCollection } from "./olive-nav-overlay";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { cn } from "~/lib/utils";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { OliveAnnouncementBar } from "./olive-announcement-bar";
import { OliveFooter } from "./olive-footer";
import { OliveHeader } from "./olive-header";
import { OliveToast } from "./olive-toast";

// Two faces only, per design.md § Typography. Josefin Sans is the wordmark,
// the navigation and every display line; Figtree carries body, UI and prices.
const fontDisplay = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-olive-display",
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontBody = Figtree({
  subsets: ["latin"],
  variable: "--font-olive-body",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

/**
 * Olive Mode's chrome. Fixed brand — there are no theme presets and no
 * `resolveThemeVars` call, so the `.olive` token block in globals.css is the
 * single source of every colour on the storefront.
 *
 * Collections are fetched once here and handed to both the header dropdown
 * and the footer's Shop column, so the nav never costs a second query. The
 * `.catch` is mandatory: `collections.getAllPublic` is feature-gated and
 * throws FORBIDDEN on a store that has the feature off.
 */
export async function OliveLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }, collections] = await Promise.all([
    getSession(),
    getBusinessFlags(),
    api.collections
      .getAllPublic()
      .catch(
        () => [] as Awaited<ReturnType<typeof api.collections.getAllPublic>>,
      ),
  ]);

  const banner = resolveBanner(business.siteContent, isEnabled("banners"));

  const navCollections: OliveNavCollection[] = collections.map(
    (collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
    }),
  );

  return (
    <div
      className={cn(
        fontDisplay.variable,
        fontBody.variable,
        "olive flex min-h-screen flex-col",
      )}
    >
      {/* Skip link — always the first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-full focus:px-4 focus:py-2 focus:shadow-lg"
        style={{
          background: "var(--olive-white)",
          color: "var(--olive-ink)",
          border: "1px solid var(--olive-hairline-strong)",
        }}
      >
        Skip to main content
      </a>

      {/* The bar sits above the sticky header so it scrolls away with the page
          and only the nav row pins. */}
      {banner ? <OliveAnnouncementBar banner={banner} /> : null}

      <OliveHeader
        business={business}
        initialSession={session ?? null}
        collections={navCollections}
      />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <OliveFooter business={business} collections={navCollections} />

      <OliveToast />
    </div>
  );
}
