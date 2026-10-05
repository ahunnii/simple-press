"use server";

import { Italiana, Mulish, Parisienne } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { safeHref } from "~/lib/safe-href";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { getRawCustomFieldString } from "~/lib/template-fields";
import { resolveThemeVars } from "~/lib/template-themes";
import { getSession } from "~/server/better-auth/server";

import { DreamAmbientController } from "../shared/dream-ambient-controller";
import { dreamMarkUrlVar } from "../shared/dream-mark";
import { nonBlank } from "../shared/dream-non-blank";
import { DreamFooter } from "./dream-footer";
import { DreamHeader } from "./dream-header";
import { resolveDreamNav } from "./dream-nav";
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
 * `dream`'s topbar is the platform announcement bar (Content → Announcements,
 * `resolveBanner`, same as `wealth`/`vii`). The old
 * `dream.global.announcement-*` fields were retired 2026-09-26: when no
 * platform banner is configured, `DreamTopbar` renders only from a legacy
 * announcement text an owner saved before the move (a silent, read-only
 * fallback — never written or cleared from here), with its link only when
 * both the saved label and a safe saved URL exist. A fresh store shows no
 * topbar until the owner turns on a banner.
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

  // One flag-filtered nav for the header, its mobile overlay and the footer's
  // quick-links fallback, so the three never disagree (P-NAV-FLAGS).
  const navItems = resolveDreamNav(
    business.siteContent?.navigationItems,
    customFields,
    isEnabled,
  );

  const banner = resolveBanner(business.siteContent, isEnabled("banners"));

  const legacyText = nonBlank(
    getRawCustomFieldString(customFields, "dream.global.announcement-text"),
  );
  const legacyLinkLabel = nonBlank(
    getRawCustomFieldString(
      customFields,
      "dream.global.announcement-link-label",
    ),
  );
  const legacyLinkUrl =
    safeHref(
      getRawCustomFieldString(customFields, "dream.global.announcement-url"),
    ) ?? undefined;
  const hasLegacyLink = Boolean(legacyLinkLabel && legacyLinkUrl);

  // `dream` has no theme presets (fixed brand, per design.md) — resolveThemeVars
  // returns null for a templateId with no TEMPLATE_THEMES entry, so this is a
  // safe no-op today and starts working automatically if a theme.ts is ever
  // added later.
  const themeVars = resolveThemeVars("dream", customFields);
  // The uploaded logo stands in for the bundled mark on empty states and
  // image fallbacks (`DreamMark`); unset → the CSS falls back to the bundle.
  const markUrl = dreamMarkUrlVar(business.siteContent?.logoUrl);

  return (
    <div
      className={`${fontItaliana.variable} ${fontParisienne.variable} ${fontMulish.variable} dream flex min-h-screen flex-col`}
      style={{
        fontFamily: "var(--font-dream-body)",
        ...themeVars,
        ...(markUrl ? { "--dream-mark-url": markUrl } : {}),
      }}
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
      ) : legacyText ? (
        <DreamTopbar
          text={legacyText}
          linkLabel={hasLegacyLink ? legacyLinkLabel : undefined}
          linkUrl={hasLegacyLink ? legacyLinkUrl : undefined}
        />
      ) : null}

      <DreamHeader
        business={business}
        initialSession={session ?? null}
        navItems={navItems}
      />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <DreamFooter
        business={business}
        navItems={navItems}
        initialSession={session ?? null}
      />

      <DreamAmbientController />
    </div>
  );
}
