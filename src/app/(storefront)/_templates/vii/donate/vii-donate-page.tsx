import { CheckCircle2 } from "lucide-react";

import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { PageTransition } from "~/components/page-animations";

// Default's resolver, not vii's: this page keeps reading the existing
// `default.donate.*` keys, and only Default's field map knows their
// `defaultValue`s — vii's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { ViiPageBand } from "../generic/vii-page-band";
import { ViiPageEmptyState } from "../generic/vii-page-empty-state";
import { ViiPageSection } from "../generic/vii-page-section";
import { nonBlank } from "../shared/vii-non-blank";
import { VII_TEXT_MEASURE } from "../shared/vii-page-edge";
import { ViiDonateForm } from "./vii-donate-form";
import { ViiDonateOtherWays } from "./vii-donate-other-ways";

/**
 * `/donate` — vii's Donate/Tip/Support page on the generic base: the cream
 * `ViiPageBand` (clears the fixed header) and one `ViiPageSection` on the
 * page edge. With both a card form and Venmo/Cash App configured, the form
 * and "Other ways to give" sit side by side at lg (form first); otherwise
 * whichever exists takes the column alone.
 *
 * Behavior contract is unchanged from Default's donate page: the card form
 * only renders when `business.isStripeConnected &&
 * business.stripeChargesEnabled` (the same gate `/checkout` and
 * `/subscribe` use — an account can be connected but still mid-onboarding);
 * "other ways to give" only renders when `resolveDonationHandles(business)`
 * is non-empty and the section isn't hidden; `?status=success` shows the
 * thank-you banner; and the "nothing configured" state is kept as a safety
 * net. Buttons are vii's (copper fill / navy outline), never Default's black.
 */
export function ViiDonatePage({
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
  // Both flags come from the connected Stripe account — see Default's
  // donate page for the full rationale (mirrors `/checkout` and
  // `/subscribe`'s gate).
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  // `showOtherWays` alone drives the "no lanes configured" empty state below
  // — a section the owner has merely hidden still counts as "configured",
  // so `isSectionVisible` only gates the block's actual render, not the
  // empty-state fallback (same split as Default's donate page).
  const showOtherWays = handles.length > 0;
  const otherWaysVisible =
    showOtherWays && isSectionVisible(customFields, "vii", "donate.other-ways");
  const showThankYou = status === "success";
  const showEmpty = !showCard && !showOtherWays;
  const sideBySide = showCard && otherWaysVisible;
  // With every lane hidden and no banner there's nothing to put under the
  // band — skip the section rather than leave an empty padded strip.
  const hasBody = showThankYou || showCard || otherWaysVisible || showEmpty;

  // This field has no static `defaultValue` — it falls back to the business's
  // resolved donation label (Donate / Leave a Tip / Support Us).
  const heading = nonBlank(f["default.donate.hero-heading"]) ?? label.pageTitle;

  const otherWays = otherWaysVisible && (
    <div {...sectionGroupAttr("donate", "other-ways")}>
      <h2
        {...fieldAttr("default.donate.other-ways-heading")}
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          fontSize: "clamp(24px, 2.6vw, 34px)",
          lineHeight: 1.15,
          color: "var(--vii-navy)",
          margin: "0 0 24px",
        }}
      >
        {nonBlank(f["default.donate.other-ways-heading"]) ??
          "Other ways to give"}
      </h2>
      <ViiDonateOtherWays
        handles={handles}
        logoUrl={business.siteContent?.logoUrl}
        stacked={sideBySide}
      />
    </div>
  );

  return (
    <PageTransition>
      <ViiPageBand
        sectionAttrs={sectionGroupAttr("donate", "hero")}
        title={heading}
        titleFieldKey="default.donate.hero-heading"
        intro={f["default.donate.hero-intro"]}
        introFieldKey="default.donate.hero-intro"
      />

      {hasBody && (
        <ViiPageSection>
          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {/* ── Thank-you banner — a live status, so never behind a reveal. */}
            {showThankYou && (
              <div
                role="status"
                {...sectionGroupAttr("donate", "thank-you")}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  maxWidth: VII_TEXT_MEASURE,
                  padding: "clamp(20px, 3vw, 28px)",
                  background: "var(--vii-success-bg)",
                  border: "1px solid var(--vii-success-border)",
                  borderRadius: "var(--radius)",
                }}
              >
                <CheckCircle2
                  aria-hidden="true"
                  style={{
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    marginTop: 2,
                    color: "var(--vii-success)",
                  }}
                />
                <div>
                  <p
                    {...fieldAttr("default.donate.thank-you-heading")}
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-serif)",
                      fontSize: "clamp(20px, 2vw, 24px)",
                      lineHeight: 1.25,
                      color: "var(--vii-navy)",
                    }}
                  >
                    {nonBlank(f["default.donate.thank-you-heading"]) ??
                      "Thank you for your support!"}
                  </p>
                  {f["default.donate.thank-you-body"] && (
                    <p
                      {...fieldAttr("default.donate.thank-you-body")}
                      style={{
                        margin: "6px 0 0",
                        fontFamily: "var(--font-sans)",
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: "var(--vii-ink-soft)",
                      }}
                    >
                      {f["default.donate.thank-you-body"]}
                    </p>
                  )}
                </div>
              </div>
            )}

            {(showCard || otherWaysVisible) && (
              <div
                className={
                  sideBySide
                    ? "grid grid-cols-1 items-start gap-14 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)] lg:gap-20"
                    : undefined
                }
              >
                {/* ── Card / Stripe Checkout form — never inside a reveal: a
                  form must not start hidden. No sectionGroupAttr:
                  "donate.form" isn't a declared field group (amount/label
                  come from Donation settings), same as Default's page. ── */}
                {showCard && (
                  <div style={{ maxWidth: 640 }}>
                    <ViiDonateForm
                      label={label}
                      presetAmountsCents={
                        (business.donationPresetAmounts as number[] | null) ??
                        DEFAULT_DONATION_PRESETS_CENTS
                      }
                    />
                  </div>
                )}

                {/* ── Other ways to give: Venmo / Cash App ────────────────── */}
                {otherWays}
              </div>
            )}

            {/* ── Empty state — should be unreachable while the "donations"
              flag is on, since the settings UI requires at least one lane
              to be configured before it can be enabled. Kept as a safety
              net for a business that had every lane removed after the fact
              (mirrors Default's donate page). ── */}
            {showEmpty && (
              <ViiPageEmptyState
                heading={`${label.noun}s aren't set up yet.`}
                body="Check back soon."
              />
            )}
          </div>
        </ViiPageSection>
      )}
    </PageTransition>
  );
}
