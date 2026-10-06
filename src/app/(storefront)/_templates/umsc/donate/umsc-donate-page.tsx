import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";

// umsc's own resolver for the band's optional photo (`umsc.donate.hero-*`).
import { resolveFields } from "..";
// Default's resolver, not umsc's: this page keeps reading the existing
// `default.donate.*` keys, and only Default's field map knows their
// `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { UmscEmptyState } from "../generic/umsc-page-kit";
import { UmscHeading } from "../shared/umsc-heading";
import { resolveUmscHeroPhoto } from "../shared/umsc-hero-fields";
import { nonBlank } from "../shared/umsc-non-blank";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscSection } from "../shared/umsc-section";
import { UmscDonateForm } from "./umsc-donate-form";
import { UmscDonateOtherWays } from "./umsc-donate-other-ways";

/**
 * `/donate` — umsc's Donate / Tip / Support page on the generic page base
 * (parity PF23): the black `UmscPageHero`, then on the shared container the
 * thank-you notice, the card form (left) and "other ways to give" (right at
 * desktop, stacked on phones), all on the page's one left edge.
 *
 * Behaviour contract is Default's donate page's, unchanged:
 * - the card form only renders when `business.isStripeConnected &&
 *   business.stripeChargesEnabled` (the same gate `/checkout` and
 *   `/subscribe` use);
 * - "other ways to give" only renders when `resolveDonationHandles(business)`
 *   is non-empty and the section isn't hidden;
 * - `?status=success` shows the thank-you notice;
 * - the "nothing configured" state is kept as a safety net.
 *
 * Nothing here sits inside a scroll reveal: the form must never start at
 * opacity 0, and the thank-you notice is a live status.
 */
export function UmscDonatePage({
  business,
  status,
}: DefaultDonatePageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, [
    "default.donate.hero-heading",
    "default.donate.hero-intro",
    "default.donate.thank-you-heading",
    "default.donate.thank-you-body",
    "default.donate.other-ways-heading",
  ]);
  const heroPhoto = resolveUmscHeroPhoto(
    resolveFields(customFields, [
      "umsc.donate.hero-image",
      "umsc.donate.hero-image-alt",
      "umsc.donate.hero-image-behind",
    ]),
    "donate",
  );

  const label = resolveDonationLabel(business.donationLabel);
  const handles = resolveDonationHandles(business);
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  // `showOtherWays` alone drives the "nothing configured" state — a section
  // the owner merely hid still counts as configured, so `isSectionVisible`
  // only gates the block's render (same split as Default's donate page).
  const showOtherWays = handles.length > 0;
  const otherWaysVisible =
    showOtherWays &&
    isSectionVisible(customFields, "umsc", "donate.other-ways");
  const showThankYou = status === "success";
  const showEmpty = !showCard && !showOtherWays;
  // With every lane hidden and no notice there's nothing under the band —
  // skip the section rather than leave an empty padded strip.
  const hasBody = showThankYou || showCard || otherWaysVisible || showEmpty;
  const twoUp = showCard && otherWaysVisible;

  // No static `defaultValue` — falls back to the business's resolved
  // donation label (Donate / Leave a Tip / Support Us).
  const heading = nonBlank(f["default.donate.hero-heading"]) ?? label.pageTitle;
  const thankYouBody = nonBlank(f["default.donate.thank-you-body"]);

  return (
    <PageTransition>
      <UmscPageHero
        heading={heading}
        headingFieldKey="default.donate.hero-heading"
        lede={f["default.donate.hero-intro"] ?? ""}
        ledeFieldKey="default.donate.hero-intro"
        {...heroPhoto}
        sectionAttrs={sectionGroupAttr("donate", "hero")}
      />

      {hasBody ? (
        <UmscSection tone="paper" aria-label={label.pageTitle}>
          <div className="flex flex-col gap-12">
            {showThankYou ? (
              <div
                role="status"
                {...sectionGroupAttr("donate", "thank-you")}
                className="flex flex-col items-start gap-3 border border-l-2 border-[var(--umsc-line)] border-l-[var(--umsc-gold)] bg-[var(--umsc-cream)] px-6 py-8 sm:px-10"
              >
                <p
                  className="umsc-serif text-[clamp(22px,2.2vw,30px)] leading-[1.15] text-[var(--umsc-ink)]"
                  {...fieldAttr("default.donate.thank-you-heading")}
                >
                  {nonBlank(f["default.donate.thank-you-heading"]) ??
                    "Thank you for your support!"}
                </p>
                {thankYouBody ? (
                  <p
                    className="umsc-sans max-w-[56ch] text-[16px] leading-[1.6] text-[var(--umsc-muted)]"
                    {...fieldAttr("default.donate.thank-you-body")}
                  >
                    {thankYouBody}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showCard || otherWaysVisible ? (
              <div
                className={cn(
                  "grid grid-cols-1 items-start gap-12",
                  twoUp &&
                    "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16",
                )}
              >
                {showCard ? (
                  <div className="w-full max-w-[720px]">
                    <UmscDonateForm
                      label={label}
                      presetAmountsCents={
                        (business.donationPresetAmounts as number[] | null) ??
                        DEFAULT_DONATION_PRESETS_CENTS
                      }
                    />
                  </div>
                ) : null}

                {otherWaysVisible ? (
                  <div
                    {...sectionGroupAttr("donate", "other-ways")}
                    className="flex flex-col gap-6"
                  >
                    <UmscHeading
                      as="h2"
                      fieldKey="default.donate.other-ways-heading"
                      className="text-[clamp(22px,2.2vw,30px)] leading-[1.15]"
                    >
                      {nonBlank(f["default.donate.other-ways-heading"]) ??
                        "Other ways to give"}
                    </UmscHeading>
                    <UmscDonateOtherWays
                      handles={handles}
                      logoUrl={business.siteContent?.logoUrl}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Should be unreachable while the "donations" flag is on (the
                settings UI requires a lane before it can be enabled); kept
                as a safety net, mirroring Default's donate page. */}
            {showEmpty ? (
              <UmscEmptyState
                heading={`${label.noun}s aren't set up yet.`}
                body="Check back soon."
              />
            ) : null}
          </div>
        </UmscSection>
      ) : null}
    </PageTransition>
  );
}
