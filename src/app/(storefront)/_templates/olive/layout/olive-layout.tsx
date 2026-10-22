"use server";

import type { CSSProperties } from "react";
import { Bodoni_Moda, Montserrat } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import type { OliveNavCollection } from "./olive-nav-overlay";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { cn } from "~/lib/utils";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import {
  donateLinkOptions,
  filterNavByFlags,
  resolveNav,
  withDonateLink,
} from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";
import { OliveAnnouncementBar } from "./olive-announcement-bar";
import { OliveFooter } from "./olive-footer";
import { OliveHeader } from "./olive-header";
import { OLIVE_DEFAULT_NAV } from "./olive-nav";
import { OliveToast } from "./olive-toast";

// Two faces only, per design.md § Type. Bodoni Moda (variable, with its
// optical-size axis so the 6.5rem display cut and the 1.375rem wordmark each
// get the right contrast) carries every voice moment; Montserrat carries the
// UI — nav, buttons, labels, body and prices.
const fontDisplay = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-olive-display",
  weight: "variable",
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontBody = Montserrat({
  subsets: ["latin"],
  variable: "--font-olive-body",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

/**
 * Up to two initials from the business name, quoted as a CSS string so
 * `OliveImageFallback` can print them via `content: var(--olive-initials)`
 * without every caller threading the business through. Letters only, so the
 * value can never break out of the string.
 */
/** A logo-size field as px, clamped to the field's own 24–400 range. */
function logoPx(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(400, Math.max(24, Math.round(parsed)));
}

function initialsFor(name: string | null | undefined): string {
  const letters = (name ?? "")
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, "").charAt(0))
    .filter((letter) => letter.length > 0)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return `"${letters}"`;
}

/**
 * Olive Mode's chrome. Fixed brand — there are no theme presets and no
 * `resolveThemeVars` call, so the `.olive` token block in globals.css is the
 * single source of every colour on the storefront.
 *
 * Collections are fetched once here and handed to both the header dropdown
 * and the footer's Shop column, so the nav never costs a second query. The
 * `.catch` is mandatory: `collections.getAllPublic` is feature-gated and
 * throws FORBIDDEN on a store that has the feature off.
 *
 * The nav is resolved once here too: the owner's saved nav (`??` semantics —
 * a saved empty list means no links) or `OLIVE_DEFAULT_NAV`, then the shared
 * route→flag filter (P-NAV-FLAGS). The header and its mobile overlay render
 * this same array; the footer resolves its own owner-editable Quick links
 * (`resolveFooterQuickLinks`, B10.4) instead, falling back to this same nav
 * when the owner hasn't set one.
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

  const banner = resolveBanner(business.siteContent, isEnabled);

  // Donations "show in header" switch: Donate appended last, so the header
  // bar and the nav overlay (both fed this list) stay in step.
  const navItems = withDonateLink(
    filterNavByFlags(
      resolveNav(business?.siteContent?.navigationItems, OLIVE_DEFAULT_NAV),
      isEnabled,
    ),
    donateLinkOptions(business, isEnabled, "header"),
  );

  // The owner's logo size (shared with the sign-in screens) sizes the
  // uploaded logo in the header; the header caps it so it never outgrows
  // the row.
  const logoFields = resolveFields(business?.siteContent?.customFields, [
    "olive.global.logo-size-width",
    "olive.global.logo-size-height",
  ]);

  const navCollections: OliveNavCollection[] = collections.map(
    (collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
    }),
  );

  return (
    <div
      data-sp-template-root=""
      className={cn(
        fontDisplay.variable,
        fontBody.variable,
        "olive flex min-h-screen flex-col",
      )}
      style={
        { "--olive-initials": initialsFor(business?.name) } as CSSProperties
      }
    >
      {/* Skip link — always the first focusable element */}
      <a
        href="#main-content"
        className="olive-label sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-3"
        style={{
          background: "var(--olive-bone)",
          color: "var(--olive-espresso)",
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
        navItems={navItems}
        logoWidth={logoPx(logoFields["olive.global.logo-size-width"], 120)}
        logoHeight={logoPx(logoFields["olive.global.logo-size-height"], 40)}
      />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <OliveFooter
        business={business}
        collections={navCollections}
        initialSession={session ?? null}
      />

      <OliveToast />
    </div>
  );
}
