import { Italiana, Mulish, Parisienne } from "next/font/google";

import type { MaintenancePageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { LaunchCountdown } from "~/components/maintenance/launch-countdown";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveDreamFields } from "../lib/resolve-fields";
import { DreamButton } from "../shared/dream-button";
import { DreamClouds } from "../shared/dream-clouds";
import { DreamLink } from "../shared/dream-link";

// Same next/font faces + `variable` names as `layout/dream-layout.tsx`,
// re-declared here because MaintenancePage renders OUTSIDE `DreamLayout` —
// `src/app/page.tsx` short-circuits to `t.MaintenancePage` before the
// template layout ever mounts, so fonts and the `.dream` scope class have
// to be re-established exactly the way the layout does it (mirrors
// `wealth-maintenance-page.tsx`'s own note).
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

const COPY = {
  coming_soon: {
    heading: "Something beautiful is on its way.",
  },
  maintenance: {
    heading: "We're setting the scene. Back soon.",
  },
} as const;

/**
 * DreamMaintenancePage — a still sky behind a centered logo, an Italiana
 * headline, the merchant's rich-text note in Mulish, and a contact line
 * (design.md Maintenance note). No template fields (see
 * `maintenance/index.ts`) — every value below comes from the platform's
 * business-scope maintenance config (`StorefrontMaintenance`, the same
 * shared model `WealthMaintenancePage`/`MaintenanceScreen` read) or the
 * `dream.global.contact-*` fields the footer already declares.
 *
 * No eyebrow/kicker line for `maintenance.overline`: the craft floor bans
 * eyebrow labels above headings, so unlike `WealthMaintenancePage` this
 * doesn't render one — the headline alone carries the weight.
 */
export function DreamMaintenancePage({
  business,
  maintenance,
}: MaintenancePageTemplateProps) {
  const copy = COPY[maintenance.variant];
  const businessName = business.name;
  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );

  // Owner-authored value wins; `null` means "no owner value" → variant default.
  const heading = maintenance.headline ?? copy.heading;
  const flyerUrl = maintenance.image;
  const launch = maintenance.launch;
  const locationText = maintenance.location;
  const cta = maintenance.cta;
  const isComingSoon = maintenance.variant === "coming_soon";

  const contact = resolveDreamFields(business.siteContent?.customFields, [
    "dream.global.contact-email",
    "dream.global.contact-phone",
  ]);
  const contactEmail = contact["dream.global.contact-email"] ?? "";
  const contactPhone = contact["dream.global.contact-phone"] ?? "";
  const hasContact = contactEmail !== "" || contactPhone !== "";

  return (
    <div
      className={`${fontItaliana.variable} ${fontParisienne.variable} ${fontMulish.variable} dream dream-maintenance relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-16 sm:px-10`}
      style={{
        fontFamily: "var(--font-dream-body)",
        background:
          "linear-gradient(180deg, var(--dream-sky) 0%, var(--dream-sky-mid) 45%, var(--dream-paper) 100%)",
      }}
    >
      {/* Maintenance keeps the sky still (design.md: "static clouds, no
          drift") regardless of motion preference — the scoped
          `@media (prefers-reduced-motion)` block in globals.css only parks
          clouds for a reduced-motion visitor, so this page adds its own
          always-on override. Can't add a new globals.css rule (out of
          scope for this agent), so it travels with the page as a small
          scoped `<style>` tag instead — see the E-phase3 report. */}
      <style>{`.dream-maintenance .dream-cloud { animation: none !important; }`}</style>

      {/* noindex while the storefront is dark, matching the shared MaintenanceScreen. */}
      <meta name="robots" content="noindex" />

      <DreamClouds variant="page" />

      <main className="relative z-[1] flex w-full max-w-[560px] flex-col items-center gap-6 text-center">
        <img
          src={logoUrl}
          alt={logoAlt}
          className="h-16 w-auto object-contain"
          decoding="async"
          fetchPriority="high"
        />

        <div
          aria-hidden="true"
          className="h-px w-[60px] bg-[var(--dream-gold)]"
        />

        <h1 className="m-0 max-w-[22ch] [font-family:var(--font-dream-display)] text-[clamp(28px,4.2vw,42px)] leading-[1.25] text-[var(--dream-ink)]">
          {heading}
        </h1>

        {flyerUrl ? (
          <figure className="w-full max-w-[360px] overflow-hidden rounded-[var(--dream-radius-card)] border border-[var(--dream-line)]">
            <img
              src={flyerUrl}
              alt={maintenance.headline ?? "Announcement flyer"}
              className="block h-auto w-full"
            />
          </figure>
        ) : null}

        {launch !== null || locationText !== null ? (
          <p className="m-0 text-[14px] text-[var(--dream-soft)]">
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
            className="text-[var(--dream-ink)] [&_[data-caption]]:mb-2 [&_[data-caption]]:block [&_[data-caption]]:text-[12px] [&_[data-caption]]:text-[var(--dream-soft)] [&_[data-label]]:mt-1 [&_[data-label]]:block [&_[data-label]]:text-[11px] [&_[data-label]]:text-[var(--dream-soft)] [&_[data-value]]:[font-family:var(--font-dream-display)] [&_[data-value]]:text-[28px] [&_[data-value]]:leading-none [&_[data-value]]:font-normal"
          />
        ) : null}

        {maintenance.message ? (
          <TiptapRenderer
            content={maintenance.message}
            className="dream-embed max-w-[48ch] text-[16px] leading-[1.7] text-[var(--dream-soft)] [&_a]:text-[var(--dream-ink)] [&_a]:underline [&_a]:decoration-[var(--dream-line)] [&_a]:underline-offset-2 [&_p]:pt-2 [&_p:first-child]:pt-0"
          />
        ) : null}

        {hasContact ? (
          <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 text-[14px] text-[var(--dream-soft)]">
            {contactEmail ? (
              <DreamLink href={`mailto:${contactEmail}`}>
                {contactEmail}
              </DreamLink>
            ) : null}
            {contactEmail && contactPhone ? (
              <span aria-hidden="true">·</span>
            ) : null}
            {contactPhone ? (
              <DreamLink href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}>
                {contactPhone}
              </DreamLink>
            ) : null}
          </p>
        ) : null}

        {cta ? (
          <DreamButton
            href={cta.href}
            variant="primary"
            external={cta.type === "external"}
          >
            {cta.label}
          </DreamButton>
        ) : null}
      </main>
    </div>
  );
}
