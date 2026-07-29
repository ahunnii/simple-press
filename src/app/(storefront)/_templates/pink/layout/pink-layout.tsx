"use server";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { resolveThemeVars } from "~/lib/template-themes";
import { getSession } from "~/server/better-auth/server";

import { PinkAnnouncementBar } from "./pink-announcement-bar";
import { PinkFooter } from "./pink-footer";
import { PinkHeader } from "./pink-header";
import { PinkJsGate } from "./pink-js-gate";
import { PinkRouteAnnouncer } from "./pink-route-announcer";
import { PINK_SCOPE_CLASS } from "./pink-scope";

export async function PinkLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }] = await Promise.all([
    getSession(),
    getBusinessFlags(),
  ]);

  const customFields = business.siteContent?.customFields;
  // Platform-wide site banner — owner-configured in the admin, gated by the
  // `banners` feature flag. Same source every other template reads.
  const banner = resolveBanner(business.siteContent, isEnabled("banners"));

  const themeVars = resolveThemeVars("pink", customFields);

  return (
    <div
      className={`${PINK_SCOPE_CLASS} flex min-h-screen flex-col`}
      style={themeVars ?? undefined}
    >
      <PinkJsGate />

      {/* Skip link — always the first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:shadow-lg"
        style={{ background: "var(--pink-paper)", color: "var(--pink-ink)" }}
      >
        Skip to main content
      </a>

      <PinkRouteAnnouncer />

      {banner && <PinkAnnouncementBar banner={banner} />}

      <PinkHeader business={business} session={session ?? null} />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <PinkFooter business={business} />
    </div>
  );
}
