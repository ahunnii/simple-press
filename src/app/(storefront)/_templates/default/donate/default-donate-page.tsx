import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { DefaultDonateForm } from "./default-donate-form";
import { DefaultDonateOtherWays } from "./default-donate-other-ways";

export function DefaultDonatePage({
  business,
  status,
}: DefaultDonatePageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "default.donate.hero-heading",
    "default.donate.hero-intro",
    "default.donate.thank-you-heading",
    "default.donate.thank-you-body",
    "default.donate.other-ways-heading",
  ]);

  const label = resolveDonationLabel(business.donationLabel);
  const handles = resolveDonationHandles(business);
  // Both flags come from the connected Stripe account, mirroring the gate
  // `checkout/page.tsx` and `/subscribe` use before rendering a payment
  // form: `isStripeConnected` alone isn't enough — an account that's
  // connected but hasn't finished onboarding can't accept charges yet.
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  // `showOtherWays` alone drives the "no lanes configured" empty state below
  // — a section the owner has merely hidden still counts as "configured",
  // so `isSectionVisible` only gates the block's actual render, not the
  // empty-state fallback.
  const showOtherWays = handles.length > 0;
  const otherWaysVisible =
    showOtherWays &&
    isSectionVisible(customFields, "default", "donate.other-ways");
  const showThankYou = status === "success";

  // `f[...]` is always a string, never undefined (see `resolveTemplateFields`),
  // and this field has no static `defaultValue` — it falls back to the
  // business's resolved donation label instead. `??` would never trigger
  // here since an unset field resolves to `""`, not `null`/`undefined`; `||`
  // is flagged by this repo's `prefer-nullish-coalescing` rule, hence the
  // explicit blank check (same reasoning as `preferNonBlank` in `~/lib/seo`).
  const heroHeading = f["default.donate.hero-heading"] ?? "";
  const heading = heroHeading.trim().length > 0 ? heroHeading : label.pageTitle;

  return (
    <PageTransition>
      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("donate", "hero")}
        className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          <h1
            className="font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance"
            {...fieldAttr("default.donate.hero-heading")}
          >
            {heading}
          </h1>
          {f["default.donate.hero-intro"] && (
            <p
              className="mt-4 max-w-[560px] text-[17px] text-[#6b6b6b]"
              {...fieldAttr("default.donate.hero-intro")}
            >
              {f["default.donate.hero-intro"]}
            </p>
          )}
        </div>
      </section>

      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto flex max-w-[720px] flex-col gap-10">
          {/* ── Thank-you banner ─────────────────────────────────────────── */}
          {showThankYou && (
            <div
              role="status"
              className="rounded-(--radius) border border-[#e8e8e8] bg-[#efece8] p-6 text-center"
              {...sectionGroupAttr("donate", "thank-you")}
            >
              <p
                className="font-serif text-[22px] font-medium tracking-[-0.01em]"
                {...fieldAttr("default.donate.thank-you-heading")}
              >
                {f["default.donate.thank-you-heading"] ??
                  "Thank you for your support!"}
              </p>
              {f["default.donate.thank-you-body"] && (
                <p
                  className="mt-2 text-sm text-[#6b6b6b]"
                  {...fieldAttr("default.donate.thank-you-body")}
                >
                  {f["default.donate.thank-you-body"]}
                </p>
              )}
            </div>
          )}

          {/* ── Card / Stripe Checkout form ─────────────────────────────── */}
          {/* No sectionGroupAttr here — "donate.form" isn't a declared field
              group or section (this form's amount/label come from Donation
              settings, not template fields), so the attribute was a stray
              hotspot that pointed at nothing. Removed 2026-09-27. */}
          {showCard && (
            <div>
              <DefaultDonateForm
                label={label}
                presetAmountsCents={
                  (business.donationPresetAmounts as number[] | null) ??
                  DEFAULT_DONATION_PRESETS_CENTS
                }
              />
            </div>
          )}

          {/* ── Other ways to give: Venmo / Cash App ────────────────────── */}
          {otherWaysVisible && (
            <div {...sectionGroupAttr("donate", "other-ways")}>
              <h2
                className="mb-5 text-center font-serif text-[22px] font-medium tracking-[-0.01em]"
                {...fieldAttr("default.donate.other-ways-heading")}
              >
                {f["default.donate.other-ways-heading"] ?? "Other ways to give"}
              </h2>
              <DefaultDonateOtherWays handles={handles} logoUrl={business.siteContent?.logoUrl} />
            </div>
          )}

          {/* ── Empty state — should be unreachable while the "donations"
              flag is on, since the settings UI requires at least one lane
              to be configured before it can be enabled. Kept as a safety
              net for a business that had every lane removed after the fact. ── */}
          {!showCard && !showOtherWays && (
            <div className="rounded-(--radius) border border-[#e8e8e8] py-24 text-center">
              <p className="text-[15px] font-medium text-[#0a0a0a]">
                {label.noun}s aren&apos;t set up yet.
              </p>
              <p className="mt-1 text-sm text-[#6b6b6b]">
                Check back soon.
              </p>
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
