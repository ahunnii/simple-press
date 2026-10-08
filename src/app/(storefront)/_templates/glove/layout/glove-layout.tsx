import { Lato, Poppins } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { resolveThemeVars } from "~/lib/template-themes";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { GloveAnnouncementBar } from "./glove-announcement-bar";
import { GloveFooter } from "./glove-footer";
import { GloveHeader } from "./glove-header";
import { GLOVE_FIELD_KEYS } from "./index";

const fontDisplay = Poppins({
  subsets: ["latin"],
  variable: "--font-glove-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontBody = Lato({
  subsets: ["latin"],
  variable: "--font-glove-body",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

/**
 * Template root: scope class + fonts, skip link, platform announcement bar,
 * three-tier header, main, footer. Fixed brand: `resolveThemeVars` is a
 * passthrough (no presets are registered, so it returns null).
 */
export async function GloveLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const { isEnabled } = resolveFlags(business.featureFlags);
  const [session, policyPages] = await Promise.all([
    getSession(),
    api.content.getSimplifiedPages({ type: "policy" }),
  ]);

  const banner = resolveBanner(business.siteContent, isEnabled("banners"));
  const themeVars = resolveThemeVars(
    "glove",
    business.siteContent?.customFields,
  );

  const f = resolveFields(
    business.siteContent?.customFields,
    Object.values(GLOVE_FIELD_KEYS),
  );
  const get = (key: string) => f[key] ?? "";
  const trackHref = get(GLOVE_FIELD_KEYS.trackLink);

  return (
    <div
      className={`${fontDisplay.variable} ${fontBody.variable} glove flex min-h-screen flex-col`}
      style={themeVars ?? undefined}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded focus:bg-[var(--glove-paper)] focus:px-4 focus:py-2 focus:text-[var(--glove-primary)] focus:shadow-lg"
      >
        Skip to main content
      </a>

      {banner ? <GloveAnnouncementBar banner={banner} /> : null}

      <GloveHeader
        business={business}
        initialSession={session ?? null}
        trackLabel={get(GLOVE_FIELD_KEYS.trackLabel)}
        trackHref={trackHref === "" ? "/order-status" : trackHref}
        // Blank saved label would leave an empty button; fall back to the default.
        accountLabel={get(GLOVE_FIELD_KEYS.accountLabel).trim() || "My Account"}
      />

      <main id="main-content" className="min-w-0 flex-1">
        {children}
      </main>

      <GloveFooter
        business={business}
        policyPages={policyPages}
        fields={{
          badge: get(GLOVE_FIELD_KEYS.footerBadge),
          blurb: get(GLOVE_FIELD_KEYS.footerBlurb),
          quickLinksHeading: get(GLOVE_FIELD_KEYS.footerQuickLinksHeading),
          customerHeading: get(GLOVE_FIELD_KEYS.footerCustomerHeading),
          contactHeading: get(GLOVE_FIELD_KEYS.footerContactHeading),
          contactIntro: get(GLOVE_FIELD_KEYS.footerContactIntro),
          questionLabel: get(GLOVE_FIELD_KEYS.footerQuestionLabel),
          paymentImage: get(GLOVE_FIELD_KEYS.footerPaymentImage),
          trackLabel: get(GLOVE_FIELD_KEYS.trackLabel),
          trackHref: trackHref === "" ? "/order-status" : trackHref,
        }}
      />
    </div>
  );
}
