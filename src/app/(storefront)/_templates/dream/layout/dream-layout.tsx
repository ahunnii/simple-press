"use server";

import { Italiana, Mulish, Parisienne } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { resolveThemeVars } from "~/lib/template-themes";
import { getSession } from "~/server/better-auth/server";

import { resolveDreamFields } from "../lib/resolve-fields";
import { DreamAmbientController } from "../shared/dream-ambient-controller";
import { DreamFooter } from "./dream-footer";
import { DreamHeader } from "./dream-header";
import { DreamPlatformBanner } from "./dream-platform-banner";
import { DreamTopbar } from "./dream-topbar";

// `variable` names are the raw next/font outputs, distinct from the
// semantic `--font-dream-display`/`--font-dream-script`/`--font-dream-body`
// names the `.dream` token block in globals.css maps them to (with fallback
// stacks) — a custom property can't reference itself, so these can't share
// a name with the semantic vars (same convention as `wealth-layout.tsx`'s
// `--font-wealth-jost` → `--font-wealth-display`).
const fontItaliana = Italiana({
  subsets: ["latin"],
  variable: "--font-dream-italiana",
  weight: "400",
  display: "swap",
});

const fontParisienne = Parisienne({
  subsets: ["latin"],
  variable: "--font-dream-parisienne",
  weight: "400",
  display: "swap",
});

const fontMulish = Mulish({
  subsets: ["latin"],
  variable: "--font-dream-mulish",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

/**
 * `dream`'s topbar honors the platform site-banner feature (`resolveBanner`,
 * same as `wealth`/`vii`) FIRST, falling back to the `dream.global.
 * announcement-*` fields (see `../lib/resolve-fields.ts`) when no platform
 * banner is configured. design.md pins a real default announcement ("Dream
 * Your Theme · Event Decor · Rentals · Draping") for the field-driven path,
 * which the site-banner feature has no concept of (a platform banner is
 * unset — and hidden — until an admin configures one), so the two coexist
 * rather than one replacing the other. `DreamTopbar` renders nothing once
 * its resolved text is blank, so an owner can still hide the fallback by
 * clearing the field to `""` if a future default ever ships empty.
 */
export async function DreamLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }] = await Promise.all([
    getSession(),
    getBusinessFlags(),
  ]);
  const customFields = business.siteContent?.customFields;

  const banner = resolveBanner(business.siteContent, isEnabled("banners"));

  const f = resolveDreamFields(customFields, [
    "dream.global.announcement-text",
    "dream.global.announcement-link-label",
    "dream.global.announcement-url",
  ]);
  const announcementText = f["dream.global.announcement-text"] ?? "";
  const announcementLinkLabel = f["dream.global.announcement-link-label"] ?? "";
  const announcementUrl = f["dream.global.announcement-url"] ?? "";

  // `dream` has no theme presets (fixed brand, per design.md) — resolveThemeVars
  // returns null for a templateId with no TEMPLATE_THEMES entry, so this is a
  // safe no-op today and starts working automatically if a theme.ts is ever
  // added later.
  const themeVars = resolveThemeVars("dream", customFields);

  return (
    <div
      className={`${fontItaliana.variable} ${fontParisienne.variable} ${fontMulish.variable} dream flex min-h-screen flex-col`}
      style={{ fontFamily: "var(--font-dream-body)", ...themeVars }}
    >
      {/* Skip link — always the first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:shadow-lg"
        style={{
          background: "var(--dream-paper)",
          color: "var(--dream-ink)",
          fontFamily: "var(--font-dream-body)",
        }}
      >
        Skip to main content
      </a>

      {banner ? (
        <DreamPlatformBanner banner={banner} />
      ) : (
        <DreamTopbar
          text={announcementText}
          linkLabel={announcementLinkLabel || undefined}
          linkUrl={announcementUrl || undefined}
        />
      )}

      <DreamHeader business={business} initialSession={session ?? null} />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <DreamFooter business={business} />

      <DreamAmbientController />
    </div>
  );
}
