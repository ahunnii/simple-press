import { CheckCircle2, HeartHandshake } from "lucide-react";

import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { FadeIn } from "~/components/page-animations";

// Default's resolver, not pollen's: this page keeps reading the existing
// `default.donate.*` keys, and only Default's field map knows their
// `defaultValue`s — pollen's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";
import { PollenDonateForm } from "./pollen-donate-form";
import { PollenDonateOtherWays } from "./pollen-donate-other-ways";

/**
 * `/donate` — pollen's Donate/Tip/Support page on the generic base
 * (`PollenGeneralLayout` band + a centered max-w-3xl column), following
 * `PinkDonatePage`'s structure. Behavior contract is unchanged from
 * Default's donate page: the card form only renders when
 * `business.isStripeConnected && business.stripeChargesEnabled` (the same
 * gate `/checkout` and `/subscribe` use — an account can be connected but
 * still mid-onboarding); "other ways to give" only renders when
 * `resolveDonationHandles(business)` is non-empty and the section isn't
 * hidden; `?status=success` shows the thank-you banner; and the "nothing
 * configured" state is kept as a safety net. Other-ways is the page ending,
 * so the global pollen CTA is off here (`showCTA={false}`, parity decision
 * 2026-09-27).
 */
export function PollenDonatePage({
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
  // Both flags come from the connected Stripe account — see
  // Default's donate page for the full rationale (mirrors `/checkout` and
  // `/subscribe`'s gate).
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  // `showOtherWays` alone drives the "no lanes configured" empty state below
  // — a section the owner has merely hidden still counts as "configured",
  // so `isSectionVisible` only gates the block's actual render, not the
  // empty-state fallback (same split as Default's donate page).
  const showOtherWays = handles.length > 0;
  const otherWaysVisible =
    showOtherWays &&
    isSectionVisible(customFields, "pollen", "donate.other-ways");
  const showThankYou = status === "success";

  // `f[...]` is always a string (see `resolveTemplateFields`) and this field
  // has no static `defaultValue` — it falls back to the business's resolved
  // donation label instead, hence the explicit blank check rather than
  // `??`/`||` (same reasoning as Default's donate page).
  const heroHeading = f["default.donate.hero-heading"] ?? "";
  const heading = heroHeading.trim().length > 0 ? heroHeading : label.pageTitle;
  const intro = f["default.donate.hero-intro"] ?? "";
  const showEmpty = !showCard && !showOtherWays;
  // With only other-ways configured (no intro, no banner, no card) the
  // white column would be an empty padded gap above the other-ways band.
  const showMain = !!intro || showThankYou || showCard || showEmpty;

  return (
    <PollenGeneralLayout
      business={business}
      title={heading}
      titleFieldKey="default.donate.hero-heading"
      sectionAttrs={sectionGroupAttr("donate", "hero")}
      showCTA={false}
    >
      {showMain && (
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-3xl flex-col gap-10 md:gap-12">
              {intro && (
                <FadeIn direction="up">
                  <p
                    className="text-center text-lg leading-relaxed text-[#4b5563] md:text-xl"
                    {...fieldAttr("default.donate.hero-intro")}
                  >
                    {intro}
                  </p>
                </FadeIn>
              )}

              {/* ── Thank-you banner — a live status, so never behind a
                reveal. ── */}
              {showThankYou && (
                <div
                  role="status"
                  className="flex flex-col items-center gap-3 rounded-2xl border border-[#A8D081] bg-[#f5f2ee] px-6 py-10 text-center sm:px-10"
                  {...sectionGroupAttr("donate", "thank-you")}
                >
                  <CheckCircle2
                    className="h-10 w-10 text-[#215935]"
                    aria-hidden="true"
                  />
                  <p
                    className="text-2xl font-bold text-balance text-[#215935]"
                    {...fieldAttr("default.donate.thank-you-heading")}
                  >
                    {f["default.donate.thank-you-heading"] ??
                      "Thank you for your support!"}
                  </p>
                  {f["default.donate.thank-you-body"] && (
                    <p
                      className="max-w-xl leading-relaxed text-[#4b5563]"
                      {...fieldAttr("default.donate.thank-you-body")}
                    >
                      {f["default.donate.thank-you-body"]}
                    </p>
                  )}
                </div>
              )}

              {/* ── Card / Stripe Checkout form — never inside a FadeIn: a
                form must not start hidden. No sectionGroupAttr: "donate.form"
                isn't a declared field group (amount/label come from Donation
                settings), same as Default's donate page. ── */}
              {showCard && (
                <PollenDonateForm
                  label={label}
                  presetAmountsCents={
                    (business.donationPresetAmounts as number[] | null) ??
                    DEFAULT_DONATION_PRESETS_CENTS
                  }
                />
              )}

              {/* ── Empty state — should be unreachable while the "donations"
                flag is on, since the settings UI requires at least one lane
                to be configured before it can be enabled. Kept as a safety
                net for a business that had every lane removed after the
                fact (mirrors Default's donate page). ── */}
              {showEmpty && (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-[#f5f2ee] px-6 py-24 text-center">
                  <HeartHandshake
                    className="mb-4 h-10 w-10 text-[#215935]/60"
                    aria-hidden="true"
                  />
                  <p className="text-lg font-semibold text-[#374151]">
                    {label.noun}s aren&apos;t set up yet.
                  </p>
                  <p className="mt-2 text-sm text-[#6b7280]">
                    Check back soon.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Other ways to give: Venmo / Cash App — the page's ending band
          (global CTA is off). ── */}
      {otherWaysVisible && (
        <section
          {...sectionGroupAttr("donate", "other-ways")}
          className="bg-[#f5f2ee] py-20 md:py-28"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn direction="up">
              <div className="mx-auto max-w-3xl">
                <h2
                  className="mb-10 text-center text-3xl font-bold text-balance text-[#374151] md:text-4xl"
                  {...fieldAttr("default.donate.other-ways-heading")}
                >
                  {f["default.donate.other-ways-heading"] ??
                    "Other ways to give"}
                </h2>
                <PollenDonateOtherWays
                  handles={handles}
                  logoUrl={business.siteContent?.logoUrl}
                />
              </div>
            </FadeIn>
          </div>
        </section>
      )}
    </PollenGeneralLayout>
  );
}
