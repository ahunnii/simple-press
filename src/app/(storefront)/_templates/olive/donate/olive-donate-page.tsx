import { CheckCircle2 } from "lucide-react";

import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

// Default's resolver, not olive's: this page keeps reading the existing
// `default.donate.*` keys, and only Default's field map knows their
// `defaultValue`s — olive's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { OlivePageBand } from "../generic/olive-page-band";
import { OlivePageSection } from "../generic/olive-page-section";
import { OliveEmptyState } from "../shared";
import { OliveDonateForm } from "./olive-donate-form";
import { OliveDonateOtherWays } from "./olive-donate-other-ways";

/** First non-blank string wins (a cleared field resolves to "", not null). */
function firstFilled(...candidates: (string | null | undefined)[]): string {
  return candidates.find((c) => c?.trim()) ?? "";
}

/**
 * `/donate` — olive's Donate / Tip / Support page on the generic base: the
 * white `OlivePageBand`, then one `OlivePageSection` on the same edge. With
 * both a card form and Venmo/Cash App configured, the form and "Other ways
 * to give" sit side by side at lg (form first); otherwise whichever exists
 * takes the column alone.
 *
 * Behaviour contract is Default's donate page's, unchanged: the card form
 * only renders when `business.isStripeConnected &&
 * business.stripeChargesEnabled` (the same gate `/checkout` and `/subscribe`
 * use); "other ways to give" only renders when
 * `resolveDonationHandles(business)` is non-empty and the section isn't
 * hidden; `?status=success` shows the thank-you banner; the "nothing
 * configured" state is kept as a safety net.
 *
 * Nothing on this page sits inside `OliveReveal`: the form must never start
 * at opacity 0, and the thank-you banner is a live status.
 */
export function OliveDonatePage({
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
    isSectionVisible(customFields, "olive", "donate.other-ways");
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

  const thankYouBody = f["default.donate.thank-you-body"]?.trim()
    ? f["default.donate.thank-you-body"]
    : null;

  return (
    <>
      <OlivePageBand
        sectionAttrs={sectionGroupAttr("donate", "hero")}
        title={heading}
        titleFieldKey="default.donate.hero-heading"
        intro={f["default.donate.hero-intro"]}
        introFieldKey="default.donate.hero-intro"
      />

      {hasBody ? (
        <OlivePageSection flush aria-label={label.pageTitle}>
          <div className="flex flex-col gap-10">
            {showThankYou ? (
              <div
                role="status"
                {...sectionGroupAttr("donate", "thank-you")}
                className="flex items-start gap-4"
                style={{
                  maxWidth: "40rem",
                  padding: "clamp(1.25rem, 3vw, 1.75rem)",
                  backgroundColor: "var(--olive-success-bg)",
                  border: "1px solid var(--olive-success-border)",
                  borderRadius: "var(--olive-card-radius)",
                }}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-6 w-6 shrink-0"
                  style={{ color: "var(--olive-success)" }}
                />
                <div className="flex flex-col gap-1.5">
                  <p
                    className="olive-h3"
                    {...fieldAttr("default.donate.thank-you-heading")}
                  >
                    {firstFilled(
                      f["default.donate.thank-you-heading"],
                      "Thank you for your support!",
                    )}
                  </p>
                  {thankYouBody ? (
                    <p
                      className="text-[0.9375rem] leading-relaxed"
                      style={{ color: "var(--olive-ink-soft)" }}
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
                    ? "grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,40rem)_minmax(0,1fr)] lg:gap-16"
                    : undefined
                }
              >
                {showCard ? (
                  <div style={{ maxWidth: "40rem" }}>
                    <OliveDonateForm
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
                    className="flex flex-col gap-5"
                  >
                    <h2
                      className="olive-h2"
                      {...fieldAttr("default.donate.other-ways-heading")}
                    >
                      {firstFilled(
                        f["default.donate.other-ways-heading"],
                        "Other ways to give",
                      )}
                    </h2>
                    <OliveDonateOtherWays
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
              <OliveEmptyState
                headingAs="h2"
                className="w-full"
                heading={`${label.noun}s aren't set up yet.`}
                body="Check back soon."
              />
            ) : null}
          </div>
        </OlivePageSection>
      ) : null}
    </>
  );
}
