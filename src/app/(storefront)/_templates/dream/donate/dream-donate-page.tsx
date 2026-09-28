import { CheckCircle2 } from "lucide-react";

import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

// Default's resolver, not dream's: this page keeps reading the existing
// `default.donate.*` keys, and only Default's field map is guaranteed to
// know their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { DreamOptionalEmptyState } from "../events/dream-optional-empty-state";
import {
  firstFilled,
  resolveDreamPageLogo,
} from "../events/dream-optional-page";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamSection } from "../shared/dream-section";
import { DreamDonateForm } from "./dream-donate-form";
import { DreamDonateOtherWays } from "./dream-donate-other-ways";

/**
 * `/donate` — dream's Donate / Tip / Support page on the generic page base
 * (parity PF20): the `DreamPageHero` sky band (heading + intro as its lede),
 * then one `DreamSection` on the container edge. With both a card form and
 * Venmo/Cash App configured, the form and "Other ways to give" sit side by
 * side at lg (form first); otherwise whichever exists takes the column
 * alone.
 *
 * Behaviour contract is Default's donate page's, unchanged: the card form
 * only renders when `business.isStripeConnected &&
 * business.stripeChargesEnabled` (the same gate `/checkout` and `/subscribe`
 * use); "other ways to give" only renders when
 * `resolveDonationHandles(business)` is non-empty and the section isn't
 * hidden; `?status=success` shows the thank-you banner; the "nothing
 * configured" state is kept as a safety net.
 *
 * Nothing on this page sits inside a reveal (`reveal={false}`): the form
 * must never start at opacity 0, and the thank-you banner is a live status.
 */
export function DreamDonatePage({
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
  const { logoUrl, logoAlt } = resolveDreamPageLogo(business);

  const label = resolveDonationLabel(business.donationLabel);
  const handles = resolveDonationHandles(business);
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  // `showOtherWays` alone drives the "nothing configured" state — a section
  // the owner merely hid still counts as configured, so `isSectionVisible`
  // only gates the block's render (same split as Default's donate page).
  const showOtherWays = handles.length > 0;
  const otherWaysVisible =
    showOtherWays &&
    isSectionVisible(customFields, "dream", "donate.other-ways");
  const showThankYou = status === "success";
  const showEmpty = !showCard && !showOtherWays;
  const sideBySide = showCard && otherWaysVisible;
  // With every lane hidden and no banner there's nothing under the band —
  // skip the section rather than leave an empty padded strip.
  const hasBody = showThankYou || showCard || otherWaysVisible || showEmpty;

  // This field has no static `defaultValue` — it falls back to the
  // business's resolved donation label (Donate / Leave a Tip / Support Us).
  const heading = firstFilled(
    f["default.donate.hero-heading"],
    label.pageTitle,
  );
  const thankYouBody = f["default.donate.thank-you-body"] ?? "";

  return (
    <>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={heading}
        titleFieldKey="default.donate.hero-heading"
        lede={f["default.donate.hero-intro"] ?? ""}
        ledeFieldKey="default.donate.hero-intro"
        sectionAttrs={sectionGroupAttr("donate", "hero")}
      />

      {hasBody ? (
        <DreamSection reveal={false} aria-label={label.pageTitle}>
          <div className="flex flex-col gap-12">
            {showThankYou ? (
              <div
                role="status"
                {...sectionGroupAttr("donate", "thank-you")}
                className="flex max-w-[40rem] items-start gap-4 rounded-[var(--dream-radius-photo)] border border-[var(--dream-line)] p-6 sm:p-8"
                style={{
                  background:
                    "linear-gradient(180deg, var(--dream-sky) 0%, var(--dream-paper) 100%)",
                }}
              >
                <CheckCircle2
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="mt-1 h-7 w-7 shrink-0 text-[var(--dream-success)]"
                />
                <div className="flex flex-col gap-2">
                  <p
                    className="[font-family:var(--font-dream-display)] text-[clamp(26px,2.6vw,34px)] leading-[1.1] text-[var(--dream-ink)]"
                    {...fieldAttr("default.donate.thank-you-heading")}
                  >
                    {firstFilled(
                      f["default.donate.thank-you-heading"],
                      "Thank you for your support!",
                    )}
                  </p>
                  {thankYouBody.trim() ? (
                    <p
                      className="text-[17px] leading-[1.7] text-[var(--dream-soft)]"
                      {...fieldAttr("default.donate.thank-you-body")}
                    >
                      {thankYouBody}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {showCard || otherWaysVisible ? (
              <div
                className={
                  sideBySide
                    ? "grid grid-cols-1 items-start gap-14 lg:grid-cols-[minmax(0,40rem)_minmax(0,1fr)] lg:gap-16"
                    : undefined
                }
              >
                {showCard ? (
                  <div className="max-w-[40rem]">
                    <DreamDonateForm
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
                    <h2
                      className="text-[clamp(28px,3.2vw,38px)] leading-[1.15]"
                      {...fieldAttr("default.donate.other-ways-heading")}
                    >
                      {firstFilled(
                        f["default.donate.other-ways-heading"],
                        "Other ways to give",
                      )}
                    </h2>
                    <DreamDonateOtherWays
                      handles={handles}
                      logoUrl={business.siteContent?.logoUrl}
                      stacked={sideBySide}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Should be unreachable while the "donations" flag is on (the
                settings UI requires a lane before it can be enabled); kept
                as a safety net, mirroring Default's donate page. */}
            {showEmpty ? (
              <DreamOptionalEmptyState
                heading={`${label.noun}s aren't set up yet.`}
                body="Check back soon."
              />
            ) : null}
          </div>
        </DreamSection>
      ) : null}
    </>
  );
}
