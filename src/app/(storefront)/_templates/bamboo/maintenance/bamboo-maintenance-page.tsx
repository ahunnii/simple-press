/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Outfit, Spectral } from "next/font/google";

import type { MaintenancePageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { resolveThemeVars } from "~/lib/template-themes";
import { cn } from "~/lib/utils";
import { LaunchCountdown } from "~/components/maintenance/launch-countdown";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import {
  BambooSocialIcons,
  readBambooSocialLinks,
} from "../layout/bamboo-social-icons";
import { BambooLeafGlyph } from "../shared/bamboo-leaf-sprig";
import { BambooWaveDivider } from "../shared/bamboo-wave-divider";
import {
  BambooWaveLeaves,
  BambooWaveSprig,
} from "../shared/bamboo-wave-leaves";

/*
  This screen renders OUTSIDE `BambooLayout` —
  `src/components/maintenance/maintenance-takeover.tsx` swaps the whole
  storefront for `t.MaintenancePage` before the template layout mounts. So the
  fonts, the `bamboo` scope class and the theme variables have to be
  established here, exactly the way `bamboo/layout/bamboo-general-layout.tsx`
  does it (same `next/font` options, same CSS variable names). There is no
  `BAMBOO_TOP_MARKER` on the top section: that contract exists to clear the
  header's hanging emblem, and this page renders without the header.
*/
const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-bam-sans",
  display: "swap",
});
const fontSerif = Spectral({
  subsets: ["latin"],
  variable: "--font-bam-serif",
  weight: ["400", "600", "700"],
  display: "swap",
});

/**
 * Static per-variant heading. Not a template field (this domain declares
 * none) — platform lifecycle copy, same precedent as
 * `olive-maintenance-page.tsx`'s own `COPY` map.
 */
const COPY = {
  maintenance: { heading: "We'll be right back." },
  coming_soon: { heading: "Something good is on the way." },
} as const;

/** Merchant rich text sits in a card on cream: preflight strips heading, list
 *  and link styling, so restore the essentials here. */
const messageClassName = cn(
  "text-muted-foreground text-base leading-relaxed text-pretty",
  "[&_p]:mb-3 [&_p:last-child]:mb-0",
  "[&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold",
  "[&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold",
  "[&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_ul]:mb-3 [&_ul]:inline-block [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left",
  "[&_ol]:mb-3 [&_ol]:inline-block [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-left",
  "[&_a]:font-medium [&_a]:text-[var(--bam-forest)] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-[var(--bam-forest-deep)]",
  "[&_strong]:text-foreground",
);

const countdownClassName = cn(
  "text-center",
  "[&_[data-caption]]:mb-2 [&_[data-caption]]:block [&_[data-caption]]:text-xs [&_[data-caption]]:font-semibold [&_[data-caption]]:tracking-widest [&_[data-caption]]:uppercase [&_[data-caption]]:text-[var(--bam-gold-rich)]",
  "[&_[data-value]]:text-2xl [&_[data-value]]:font-bold [&_[data-value]]:text-[var(--bam-forest)] sm:[&_[data-value]]:text-3xl",
  "[&_[data-label]]:text-muted-foreground [&_[data-label]]:text-xs",
);

const primaryButtonClassName =
  "inline-flex items-center gap-2.5 rounded-full bg-[var(--bam-forest)] px-7 py-3.5 text-base font-semibold tracking-wider text-[var(--bam-cream)] uppercase shadow-lg ring-2 ring-[var(--bam-gold-bright)]/80 transition-colors hover:bg-[var(--bam-forest-deep)]";

const contactLinkClassName =
  "transition-colors hover:text-[var(--bam-cream)] hover:underline underline-offset-4";

/**
 * BambooMaintenancePage — the bamboo homepage, parked. Used while a store is
 * in business maintenance mode (and as the "parked" screen for a store
 * leaving the platform), so it echoes the homepage and puts the owner's
 * socials and contact details front and centre.
 *
 * Top: a cream section (the homepage hero's background photo sits behind a
 * strong cream wash when one is set) holding one opaque cream card with the
 * emblem disc, the heading, the owner's message, flyer, launch countdown and
 * CTA. Every word of text sits on that opaque card, so contrast never depends
 * on the photo.
 *
 * Bottom: the canonical hairline gold wave into a bold forest band — wave
 * sprigs rooted on the seam, per the footer's composition — carrying a
 * "Stay in touch" block of social icons and email / phone / address.
 *
 * Every date string arrives pre-formatted from `resolveMaintenanceLaunch`;
 * nothing here formats a date. `LaunchCountdown` is the one client component,
 * so the page stays a server component. No motion: nothing hides behind a
 * reveal, and there is nothing to disable for reduced motion.
 */
export function BambooMaintenancePage({
  business,
  maintenance,
}: MaintenancePageTemplateProps) {
  const copy = COPY[maintenance.variant];
  const businessName = business.name;
  const logoUrl = business.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );
  const cta = maintenance.cta;

  const customFields = business.siteContent?.customFields;
  const themeVars = resolveThemeVars("bamboo", customFields);

  // Same reading as the homepage hero's `hasBg`: any non-empty saved value is
  // a real photo (the field's default is ""), plus the legacy placeholder
  // guard so an untouched placeholder never renders as a photo.
  const f = resolveFields(customFields, ["bamboo.homepage.hero-bg-image"]);
  const bgImage = (f["bamboo.homepage.hero-bg-image"] ?? "").trim();
  const hasBg = bgImage.length > 0 && bgImage !== "/placeholder.svg";

  // `null` means "no owner value" → variant default. Overline has no default
  // of its own: it renders only when the owner explicitly sets one.
  const heading = maintenance.headline ?? copy.heading;
  const overline = maintenance.overline;

  const flyerUrl = maintenance.image;
  const launch = maintenance.launch;
  const locationText = maintenance.location;
  const isComingSoon = maintenance.variant === "coming_soon";

  const socialLinks = readBambooSocialLinks(business.siteContent?.socialLinks);
  const email = business.supportEmail?.trim() ?? "";
  const phone = business.phoneNumber?.trim() ?? "";
  const address = business.businessAddress?.trim() ?? "";
  const hasContact = email !== "" || phone !== "" || address !== "";
  const hasSocials = socialLinks.length > 0;
  const hasReachOut = hasContact || hasSocials;

  return (
    <div
      className={`${fontSans.variable} ${fontSerif.variable} bamboo bg-background relative flex min-h-dvh flex-col`}
      style={themeVars ?? undefined}
    >
      {/* noindex while the storefront is dark — same rationale as
          src/components/maintenance/maintenance-screen.tsx (React 19 hoists
          this to <head> regardless of where it renders). */}
      <meta name="robots" content="noindex" />

      <main className="flex flex-1 flex-col">
        <section
          aria-label={businessName}
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-[var(--bam-cream)] px-4 pt-12 pb-28 sm:px-6 sm:pt-16 md:pb-32"
        >
          {hasBg ? (
            <>
              {/* Raw `<img>`, not `next/image`: the URL is arbitrary merchant
                  input and next/image's remotePatterns allowlist 500s on
                  unknown hosts (same reason as the homepage hero). */}
              <img
                src={bgImage}
                alt=""
                aria-hidden="true"
                loading="eager"
                fetchPriority="high"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[var(--bam-cream)]/75"
              />
            </>
          ) : null}

          <div className="relative flex w-full max-w-xl flex-col items-center gap-6 rounded-3xl border border-[var(--bam-gold-soft)] bg-[var(--bam-cream)] px-6 py-10 text-center shadow-xl sm:px-10 sm:py-12">
            {logoUrl ? (
              <span className="relative block size-24 shrink-0 rounded-full bg-[var(--bam-cream)] shadow-lg ring-[3px] ring-[var(--bam-gold-soft)] lg:size-[7.5rem]">
                <Image
                  src={logoUrl}
                  alt={logoAlt}
                  fill
                  sizes="(min-width: 1024px) 120px, 96px"
                  className="object-contain p-2"
                  priority
                />
              </span>
            ) : (
              <p className="font-serif text-2xl font-bold tracking-tight text-[var(--bam-forest)]">
                {businessName}
              </p>
            )}

            <div className="flex flex-col items-center">
              {overline ? (
                <p className="mb-3 text-sm font-semibold tracking-widest text-[var(--bam-gold-rich)] uppercase">
                  {overline}
                </p>
              ) : null}

              <h1 className="font-serif text-4xl font-bold tracking-tight text-balance text-[var(--bam-forest)] sm:text-5xl">
                {heading}
              </h1>

              {/* Leaf rule — the homepage hero's markup, trimmed to the card. */}
              <div
                aria-hidden="true"
                className="mt-6 flex w-full max-w-xs items-center gap-3"
              >
                <span className="h-px flex-1 bg-[var(--bam-gold-display)]/70" />
                <BambooLeafGlyph className="h-5 w-8 shrink-0 text-[var(--bam-gold-display)]" />
                <span className="h-px flex-1 bg-[var(--bam-gold-display)]/70" />
              </div>
            </div>

            {maintenance.message ? (
              <TiptapRenderer
                content={maintenance.message}
                className={messageClassName}
              />
            ) : null}

            {/* Announcement flyer. Intrinsic sizing (`height: auto`) rather
                than `fill`: the owner can upload any aspect ratio and we must
                not crop an image whose whole point is the text printed on it. */}
            {flyerUrl ? (
              <figure className="w-full max-w-sm overflow-hidden rounded-xl border border-[var(--bam-gold-soft)]/60">
                <Image
                  src={flyerUrl}
                  alt={maintenance.headline ?? "Grand opening flyer"}
                  width={840}
                  height={1050}
                  sizes="(max-width: 640px) 90vw, 384px"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </figure>
            ) : null}

            {/* When / where. Both halves are optional, so the middot separator
                is emitted only when there is something on either side of it. */}
            {launch !== null || locationText !== null ? (
              <p className="text-sm font-semibold tracking-widest text-[var(--bam-forest)] uppercase">
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
                className={countdownClassName}
              />
            ) : null}

            {cta ? (
              cta.type === "external" ? (
                <a
                  href={cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={primaryButtonClassName}
                >
                  {cta.label}
                </a>
              ) : (
                <Link href={cta.href} className={primaryButtonClassName}>
                  {cta.label}
                </Link>
              )
            ) : null}
          </div>
        </section>
      </main>

      <footer className="relative overflow-x-clip">
        {/* Canonical wave + sprigs, composed exactly like `BambooFooter`: the
            wrapper's negative margin pulls the hairline up over the top
            section's bottom padding, so cream (or the washed photo) runs
            straight into the gold line with no seam. */}
        <div className="pointer-events-none relative -mt-10 -mb-px md:-mt-14">
          <BambooWaveDivider variant="hairline" className="h-10 md:h-14" />

          <BambooWaveLeaves className="z-[2]">
            <BambooWaveSprig
              side="left"
              className="top-10 w-24 opacity-90 md:top-[4.25rem] md:w-32"
            />
            <BambooWaveSprig
              side="right"
              className="top-11 w-24 opacity-90 md:top-[4.5rem] md:w-32 lg:top-[5.25rem] lg:w-36"
            />
          </BambooWaveLeaves>
        </div>

        <div className="bg-[var(--bam-forest)] text-[var(--bam-cream)]">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 pt-14 pb-10 text-center sm:px-6">
            {hasReachOut ? (
              <>
                <h2 className="font-serif text-3xl font-bold tracking-tight text-[var(--bam-cream)] sm:text-4xl">
                  Stay in touch
                </h2>

                {hasSocials ? (
                  <BambooSocialIcons
                    socialLinks={socialLinks}
                    label={`Follow ${businessName}`}
                    className="flex-wrap justify-center gap-3"
                    linkClassName="size-11 rounded-full border border-[var(--bam-gold-soft)]/50 text-[var(--bam-gold-soft)] hover:border-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)]"
                    iconClassName="size-5"
                  />
                ) : null}

                {hasContact ? (
                  <address className="flex flex-col items-center gap-3 text-base text-[var(--bam-cream)]/85 not-italic md:flex-row md:flex-wrap md:justify-center md:gap-x-8">
                    {email ? (
                      <a
                        href={`mailto:${email}`}
                        className={cn(
                          "inline-flex items-center gap-2",
                          contactLinkClassName,
                        )}
                      >
                        <Mail
                          className="size-4 shrink-0 text-[var(--bam-gold-soft)]"
                          aria-hidden="true"
                        />
                        <span className="break-all">{email}</span>
                      </a>
                    ) : null}
                    {phone ? (
                      <a
                        href={`tel:${phone.replace(/\D/g, "")}`}
                        className={cn(
                          "inline-flex items-center gap-2",
                          contactLinkClassName,
                        )}
                      >
                        <Phone
                          className="size-4 shrink-0 text-[var(--bam-gold-soft)]"
                          aria-hidden="true"
                        />
                        <span>{phone}</span>
                      </a>
                    ) : null}
                    {address ? (
                      <span className="inline-flex items-start gap-2 text-left">
                        <MapPin
                          className="mt-1 size-4 shrink-0 text-[var(--bam-gold-soft)]"
                          aria-hidden="true"
                        />
                        <span>{address}</span>
                      </span>
                    ) : null}
                  </address>
                ) : null}
              </>
            ) : (
              <p className="font-serif text-2xl font-bold tracking-tight text-[var(--bam-cream)]">
                {businessName}
              </p>
            )}

            <p className="w-full border-t border-[var(--bam-gold-soft)]/20 pt-6 text-xs text-[var(--bam-cream)]/70">
              &copy; {new Date().getFullYear()} {businessName}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
