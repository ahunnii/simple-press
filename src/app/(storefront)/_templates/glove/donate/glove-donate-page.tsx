import { CheckCircle2 } from "lucide-react";

import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

// Default's resolver, not glove's: this page keeps reading the existing
// `default.donate.*` keys; only Default's field map knows their defaults.
import { resolveFields as resolveDefaultFields } from "../../default";
import { GloveEmptyState } from "../generic/glove-empty-state";
import { GloveGeneralLayout } from "../generic/glove-general-layout";
import { GloveHeading, GloveSection } from "../shared";
import { GloveDonateForm } from "./glove-donate-form";
import { GloveDonateOtherWays } from "./glove-donate-other-ways";

const FIELD_KEYS = [
  "default.donate.hero-heading",
  "default.donate.hero-intro",
  "default.donate.thank-you-heading",
  "default.donate.thank-you-body",
  "default.donate.other-ways-heading",
];

/**
 * `/donate` — glove's Donate / Tip / Support page on the generic base (navy
 * band + a centered column). Behavior contract is Default's: the card form
 * only renders when `business.isStripeConnected && stripeChargesEnabled`;
 * "other ways to give" only when `resolveDonationHandles(business)` is
 * non-empty and the section isn't hidden; `?status=success` shows the
 * thank-you banner; the "nothing configured" state is a safety net.
 */
export function GloveDonatePage({
  business,
  status,
}: DefaultDonatePageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);
  const get = (key: string) => f[key] ?? "";

  const label = resolveDonationLabel(business.donationLabel);
  const handles = resolveDonationHandles(business);
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  // A hidden other-ways section still counts as "configured" for the
  // empty-state fallback; `isSectionVisible` only gates the actual render.
  const showOtherWays = handles.length > 0;
  const otherWaysVisible =
    showOtherWays &&
    isSectionVisible(customFields, "glove", "donate.other-ways");
  const showThankYou = status === "success";

  // The heading field has no static default (it falls back to the donation
  // label), so test for blank explicitly rather than using `??`.
  const heroHeading = get("default.donate.hero-heading");
  const heading = heroHeading.trim().length > 0 ? heroHeading : label.pageTitle;
  const intro = get("default.donate.hero-intro");
  const showEmpty = !showCard && !showOtherWays;
  const showMain = showThankYou || showCard || showEmpty;

  return (
    <GloveGeneralLayout
      title={heading}
      titleFieldKey="default.donate.hero-heading"
      subtitle={intro}
      subtitleFieldKey="default.donate.hero-intro"
      breadcrumb={[{ label: "Home", href: "/" }, { label: heading }]}
      sectionAttrs={sectionGroupAttr("donate", "hero")}
    >
      {showMain ? (
        // No reveal: the form must never start hidden, and the thank-you
        // banner is a live status.
        <GloveSection tone="paper" aria-label={heading} reveal={false}>
          <div className="mx-auto flex max-w-[760px] flex-col gap-10">
            {showThankYou ? (
              <div
                role="status"
                className="glove-mist-panel flex flex-col items-center gap-3 px-6 py-10 text-center sm:px-10"
                {...sectionGroupAttr("donate", "thank-you")}
              >
                <CheckCircle2
                  className="size-10 text-[var(--glove-primary)]"
                  aria-hidden="true"
                />
                <p
                  className="glove-display text-[24px] leading-tight font-medium text-balance text-[var(--glove-ink)]"
                  {...fieldAttr("default.donate.thank-you-heading")}
                >
                  {get("default.donate.thank-you-heading")}
                </p>
                {get("default.donate.thank-you-body") ? (
                  <p
                    className="glove-body max-w-xl text-[16px] leading-relaxed text-[var(--glove-text)]"
                    {...fieldAttr("default.donate.thank-you-body")}
                  >
                    {get("default.donate.thank-you-body")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showCard ? (
              <GloveDonateForm
                label={label}
                presetAmountsCents={
                  (business.donationPresetAmounts as number[] | null) ??
                  DEFAULT_DONATION_PRESETS_CENTS
                }
              />
            ) : null}

            {/* Should be unreachable while the "donations" flag is on (the
                settings UI requires a lane before enabling), but kept as a
                safety net for a business whose lanes were all removed. */}
            {showEmpty ? (
              <GloveEmptyState
                heading={`${label.noun}s aren't set up yet.`}
                body="Check back soon."
              />
            ) : null}
          </div>
        </GloveSection>
      ) : null}

      {otherWaysVisible ? (
        <GloveSection
          tone="mist"
          aria-label={get("default.donate.other-ways-heading")}
          sectionAttrs={sectionGroupAttr("donate", "other-ways")}
          revealThreshold={0}
        >
          <div className="mx-auto max-w-[760px]">
            <GloveHeading
              fieldKey="default.donate.other-ways-heading"
              className="mb-10"
            >
              {get("default.donate.other-ways-heading")}
            </GloveHeading>
            <GloveDonateOtherWays
              handles={handles}
              logoUrl={business.siteContent?.logoUrl}
            />
          </div>
        </GloveSection>
      ) : null}
    </GloveGeneralLayout>
  );
}
