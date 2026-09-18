import { Marcellus, Work_Sans } from "next/font/google";
import { Phone } from "lucide-react";

import type { MaintenancePageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { resolveThemeVars } from "~/lib/template-themes";
import { LaunchCountdown } from "~/components/maintenance/launch-countdown";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { UmscButton } from "../shared/umsc-button";
import {
  hasCustomImage,
  UmscImageFallback,
} from "../shared/umsc-image-fallback";

/*
  This screen renders OUTSIDE `UmscLayout` — `src/app/page.tsx` and
  `src/app/(storefront)/layout.tsx` short-circuit to `t.MaintenancePage`
  before the template layout ever mounts (same as `vii-maintenance-page.tsx`
  and `dream-maintenance-page.tsx`), so the fonts, the `umsc` scope class,
  and the merchant's resolved theme vars all have to be established here
  exactly the way `layout/umsc-layout.tsx` does it. Same font config
  (weights, `variable` names) as that file.
*/
const fontSerif = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-umsc-serif",
  display: "swap",
});

const fontSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-umsc-sans",
  display: "swap",
});

const COPY = {
  coming_soon: {
    heading: "Something small-batch is on its way.",
  },
  maintenance: {
    heading: "We're tending the shop. Back shortly.",
  },
} as const;

/**
 * UmscMaintenancePage — cheap static per design.md's "Maintenance" note: a
 * centred mark on black with a faint gold radial glow, a Marcellus message,
 * Work Sans body copy, and a phone line. No template fields (see
 * `maintenance/index.ts` — none exists; every value below comes from the
 * platform's business-scope maintenance config, `StorefrontMaintenance`, the
 * same shared model `ViiMaintenancePage`/`DreamMaintenancePage` read, plus
 * `business.phoneNumber` for the phone line design.md calls for).
 *
 * No eyebrow/kicker line for `maintenance.overline` (unlike vii's overline):
 * the craft floor bans eyebrow labels above headings — the headline alone
 * carries the weight, matching `DreamMaintenancePage`'s same reasoning.
 */
export function UmscMaintenancePage({
  business,
  maintenance,
}: MaintenancePageTemplateProps) {
  const copy = COPY[maintenance.variant];
  const themeVars = resolveThemeVars(
    "umsc",
    business.siteContent?.customFields,
  );

  const businessName = business.name;
  const logoUrl = business.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );
  const hasLogo = hasCustomImage(logoUrl);

  const heading = maintenance.headline ?? copy.heading;
  const flyerUrl = maintenance.image;
  const launch = maintenance.launch;
  const locationText = maintenance.location;
  const cta = maintenance.cta;
  const isComingSoon = maintenance.variant === "coming_soon";
  const phone = business.phoneNumber ?? "";

  return (
    <div
      className={`${fontSerif.variable} ${fontSans.variable} umsc flex min-h-dvh items-center justify-center px-6 py-16 sm:px-10`}
      style={{
        fontFamily: "var(--font-sans)",
        background:
          "radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--umsc-gold) 14%, transparent) 0%, transparent 62%), var(--umsc-black)",
        ...themeVars,
      }}
    >
      {/* noindex while the storefront is dark — matches the shared
          MaintenanceScreen / vii / dream maintenance pages. */}
      <meta name="robots" content="noindex" />

      <main className="relative z-[1] flex w-full max-w-[560px] flex-col items-center gap-6 text-center">
        {/* Centred mark — business logo in the header's round gold-hairline
            ring, or the designed `UmscImageFallback` (never a bare box). */}
        <div className="relative size-[72px] shrink-0 overflow-hidden rounded-full border border-[var(--umsc-line-gold)]">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- this screen renders outside next/image's layout context, same as vii/dream's maintenance pages.
            <img
              src={logoUrl!}
              alt={logoAlt}
              className="h-full w-full object-cover"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <UmscImageFallback onBlack />
          )}
        </div>

        <h1 className="umsc-serif m-0 max-w-[22ch] text-[clamp(28px,4.4vw,44px)] leading-[1.2] tracking-[0.015em] text-balance text-[var(--umsc-cream-on-black)]">
          {heading}
        </h1>

        <p className="umsc-sans m-0 text-[12px] font-semibold tracking-[0.13em] text-[var(--umsc-gold-soft)] uppercase">
          {businessName}
        </p>

        {/* Announcement flyer — intrinsic sizing so any owner-uploaded
            aspect ratio renders uncropped (same rationale as vii/dream). */}
        {flyerUrl ? (
          <figure className="w-full max-w-[360px] overflow-hidden border border-[var(--umsc-line-gold)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- see note above. */}
            <img
              src={flyerUrl}
              alt={maintenance.headline ?? "Announcement flyer"}
              className="block h-auto w-full"
            />
          </figure>
        ) : null}

        {launch !== null || locationText !== null ? (
          <p className="umsc-sans m-0 text-[14px] text-[var(--umsc-cream-on-black)]">
            {launch ? (
              <time dateTime={launch.dateTimeAttr}>
                {launch.dateText}
                {launch.timeText ? ` · ${launch.timeText}` : ""}
              </time>
            ) : null}
            {launch && locationText ? " · " : null}
            {locationText ? <span>{locationText}</span> : null}
          </p>
        ) : null}

        {launch ? (
          <LaunchCountdown
            targetIso={launch.startAt}
            label={isComingSoon ? "Opening in" : "Back in"}
            pastLabel={isComingSoon ? "Now open" : "We're back"}
            className="umsc-tabular [&_[data-value]]:umsc-serif text-[var(--umsc-cream-on-black)] [&_[data-caption]]:mb-2 [&_[data-caption]]:block [&_[data-caption]]:text-[12px] [&_[data-caption]]:tracking-[0.1em] [&_[data-caption]]:text-[var(--umsc-muted)] [&_[data-caption]]:uppercase [&_[data-label]]:mt-1 [&_[data-label]]:block [&_[data-label]]:text-[11px] [&_[data-label]]:text-[var(--umsc-muted)] [&_[data-value]]:text-[28px] [&_[data-value]]:leading-none [&_[data-value]]:font-normal [&_[data-value]]:text-[var(--umsc-gold-soft)]"
          />
        ) : null}

        {maintenance.message ? (
          <TiptapRenderer
            content={maintenance.message}
            className="umsc-sans max-w-[48ch] text-[16px] leading-[1.7] text-[var(--umsc-cream-on-black)] [&_a]:text-[var(--umsc-gold-soft)] [&_a]:underline [&_a]:underline-offset-[0.18em] [&_p]:pt-2 [&_p:first-child]:pt-0"
          />
        ) : null}

        {phone && (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="umsc-sans flex items-center gap-2 text-[14px] text-[var(--umsc-cream-on-black)] no-underline hover:opacity-80"
          >
            <Phone
              className="size-4 shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            {phone}
          </a>
        )}

        {cta ? (
          <UmscButton
            as="link"
            href={cta.href}
            variant="gold"
            external={cta.type === "external"}
          >
            {cta.label}
          </UmscButton>
        ) : null}
      </main>
    </div>
  );
}
