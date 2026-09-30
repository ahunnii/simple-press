import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { PageTransition } from "~/components/page-animations";

// Default's resolver, not noise's: this page keeps reading the existing
// `default.donate.*` keys, and only Default's field map knows their
// `defaultValue`s — noise's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { NoiseEmptyState } from "../generic/noise-empty-state";
import { NoisePageBand, NoisePageBody } from "../generic/noise-page-shell";
import { nonBlank } from "../shared/noise-non-blank";
import { NoiseDonateForm } from "./noise-donate-form";
import { NoiseDonateOtherWays } from "./noise-donate-other-ways";

/**
 * `/donate` — noise's Donate / Tip / Support page on the generic page base
 * (PF12): the centred title band, then one centred `max-w-3xl` column with
 * the thank-you notice, the card form and "other ways to give".
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
export function NoiseDonatePage({
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

  const label = resolveDonationLabel(business.donationLabel);
  const handles = resolveDonationHandles(business);
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  // `showOtherWays` alone drives the "nothing configured" state — a section
  // the owner merely hid still counts as configured, so `isSectionVisible`
  // only gates the block's render (same split as Default's donate page).
  const showOtherWays = handles.length > 0;
  const otherWaysVisible =
    showOtherWays &&
    isSectionVisible(customFields, "noise", "donate.other-ways");
  const showThankYou = status === "success";
  const showEmpty = !showCard && !showOtherWays;
  // With every lane hidden and no notice there's nothing under the band —
  // skip the section rather than leave an empty padded strip.
  const hasBody = showThankYou || showCard || otherWaysVisible || showEmpty;

  // This field has no static `defaultValue` — it falls back to the
  // business's resolved donation label (Donate / Leave a Tip / Support Us).
  const heading = nonBlank(f["default.donate.hero-heading"]) ?? label.pageTitle;
  const thankYouBody = nonBlank(f["default.donate.thank-you-body"]);

  return (
    <PageTransition>
      <NoisePageBand
        sectionAttrs={sectionGroupAttr("donate", "hero")}
        title={heading}
        titleFieldKey="default.donate.hero-heading"
        intro={f["default.donate.hero-intro"]}
        introFieldKey="default.donate.hero-intro"
      />

      {hasBody ? (
        <NoisePageBody width="measure" aria-label={label.pageTitle}>
          <div className="flex flex-col gap-14">
            {showThankYou ? (
              <div
                role="status"
                {...sectionGroupAttr("donate", "thank-you")}
                className="flex flex-col items-center gap-4 border border-(--vn-ink) px-6 py-12 text-center"
                style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
              >
                <span
                  aria-hidden="true"
                  className="font-serif leading-none italic"
                  style={{ fontSize: "44px", opacity: 0.4 }}
                >
                  ✓
                </span>
                <p
                  className="font-serif leading-[1.1] italic"
                  style={{ fontSize: "28px", letterSpacing: "-0.01em" }}
                  {...fieldAttr("default.donate.thank-you-heading")}
                >
                  {nonBlank(f["default.donate.thank-you-heading"]) ??
                    "Thank you for your support!"}
                </p>
                {thankYouBody ? (
                  <p
                    className="font-sans text-[14px] leading-relaxed"
                    style={{ opacity: 0.78, maxWidth: "46ch" }}
                    {...fieldAttr("default.donate.thank-you-body")}
                  >
                    {thankYouBody}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showCard ? (
              <NoiseDonateForm
                label={label}
                presetAmountsCents={
                  (business.donationPresetAmounts as number[] | null) ??
                  DEFAULT_DONATION_PRESETS_CENTS
                }
              />
            ) : null}

            {otherWaysVisible ? (
              <div {...sectionGroupAttr("donate", "other-ways")}>
                <div className="mb-8 border-b border-(--vn-ink) pb-5">
                  <h2
                    className="font-serif leading-none tracking-tight italic"
                    style={{
                      fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
                      letterSpacing: "-0.02em",
                    }}
                    {...fieldAttr("default.donate.other-ways-heading")}
                  >
                    {nonBlank(f["default.donate.other-ways-heading"]) ??
                      "Other ways to give"}
                  </h2>
                </div>
                <NoiseDonateOtherWays
                  handles={handles}
                  logoUrl={business.siteContent?.logoUrl}
                />
              </div>
            ) : null}

            {/* Should be unreachable while the "donations" flag is on (the
                settings UI requires a lane before it can be enabled); kept
                as a safety net, mirroring Default's donate page. */}
            {showEmpty ? (
              <NoiseEmptyState
                heading={`${label.noun}s aren't set up yet.`}
                body="Check back soon."
              />
            ) : null}
          </div>
        </NoisePageBody>
      ) : null}
    </PageTransition>
  );
}
