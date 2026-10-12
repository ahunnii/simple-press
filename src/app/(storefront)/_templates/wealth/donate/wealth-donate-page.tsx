import { Heart } from "lucide-react";

import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { WealthBlock } from "../shared/wealth-block";
import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthOverlapCard } from "../shared/wealth-overlap-card";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthSplitHero } from "../shared/wealth-split-hero";
import { WealthDonateForm } from "./wealth-donate-form";
import { WealthDonateOtherWays } from "./wealth-donate-other-ways";

const FIELD_KEYS = [
  "wealth.donate.hero-image",
  "wealth.donate.hero-image-alt",
  "wealth.donate.header-heading",
  "wealth.donate.header-eyebrow",
  "wealth.donate.header-body-1",
  "wealth.donate.header-body-2",
  "wealth.donate.form-heading",
  "wealth.donate.thank-you-heading",
  "wealth.donate.thank-you-body",
  "wealth.donate.other-ways-heading",
  "wealth.donate.impact-heading",
  "wealth.donate.impact-body",
  "wealth.donate.impact-image",
  "wealth.donate.impact-image-alt",
];

/** Blank-check without `||` (the lint rule rejects it on `string | undefined`). */
function orFallback(value: string | undefined, fallback: string): string {
  const v = value ?? "";
  return v.trim().length > 0 ? v : fallback;
}

/**
 * Wealth's styled Donate page — DCWF's "Support DCWF" page (the live
 * Squarespace site used a Donorbox iframe; this rebuilds it entirely on the
 * platform's donations flow). 2026-10-12 redesign, top to bottom:
 *
 * 1. Split hero (`donate.header`) — optional photo, else a full-width forest
 *    panel: eyebrow, italic H1, intro paragraph.
 * 2. Give (`surface` block) — second paragraph + form heading on the left,
 *    the platform donation form in a paper card on the right.
 * 3. Where your gift goes (`donate.impact`, hideable) — overlap card.
 * 4. Other ways to give (`donate.other-ways`, hideable) — Venmo / Cash App.
 *
 * The thank-you (`donate.thank-you`, forest status card, only after a
 * successful donation) renders directly under the hero so a donor returning
 * from Stripe sees it above the fold.
 *
 * FUNCTIONALITY mirrors `PinkDonatePage`/`DefaultDonatePage` exactly: the
 * form only renders when `business.isStripeConnected &&
 * business.stripeChargesEnabled` (same gate `/checkout` and `/subscribe`
 * use), "other ways to give" only renders when
 * `resolveDonationHandles(business)` is non-empty, and the thank-you panel
 * only renders for `status === "success"`.
 *
 * The form is a client island and is never wrapped in a reveal.
 */
export function WealthDonatePage({
  business,
  status,
}: DefaultDonatePageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const label = resolveDonationLabel(business.donationLabel);
  const handles = resolveDonationHandles(business);
  // Both flags come from the connected Stripe account — see
  // `PinkDonatePage` for the full rationale (mirrors `/checkout` and
  // `/subscribe`'s gate: a Stripe account can be connected but still
  // mid-onboarding).
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  const showThankYou = status === "success";
  // Both conditions: a handle is configured AND the owner hasn't hidden the
  // section (`donate.other-ways` is hideable).
  const showOtherWays =
    handles.length > 0 &&
    isSectionVisible(customFields, "wealth", "donate.other-ways");

  // `f[...]` is always a string, never undefined — see `resolveFields` /
  // `resolveTemplateFields` — and a blank saved value resolves to the
  // field's default, so `orFallback` is a belt-and-braces blank check.
  const heading = orFallback(
    f["wealth.donate.header-heading"],
    label.pageTitle,
  );
  const eyebrow = f["wealth.donate.header-eyebrow"] ?? "";
  const body1 = f["wealth.donate.header-body-1"] ?? "";
  const body2 = f["wealth.donate.header-body-2"] ?? "";
  const heroImage = f["wealth.donate.hero-image"] ?? "";

  const thankYouHeading = orFallback(
    f["wealth.donate.thank-you-heading"],
    "Thank you for supporting worker-ownership.",
  );
  const thankYouBody = f["wealth.donate.thank-you-body"] ?? "";

  const otherWaysHeading = orFallback(
    f["wealth.donate.other-ways-heading"],
    "Other ways to give",
  );

  const impactHeading = f["wealth.donate.impact-heading"] ?? "";
  const impactBody = f["wealth.donate.impact-body"] ?? "";
  const impactImage = f["wealth.donate.impact-image"] ?? "";
  const showImpact =
    isSectionVisible(customFields, "wealth", "donate.impact") &&
    (impactHeading.trim() !== "" || impactBody.trim() !== "");

  const formHeading = f["wealth.donate.form-heading"] ?? "";
  const showFormHeading = showCard && formHeading.trim() !== "";

  // The Give block exists whenever there is something to give *with*: the
  // form, or — for a Venmo/Cash App-only store — the intro paragraph that
  // leads into those cards. A store with neither shows the empty state.
  const showGive = showCard || (showOtherWays && body2.trim() !== "");
  const hasIntro = body2.trim() !== "" || showFormHeading;
  const showEmpty = !showCard && !showOtherWays;

  const impactCardContent = (
    <>
      {impactHeading.trim() ? (
        <h2
          id="wealth-donate-impact-h"
          className="wealth-display"
          {...fieldAttr("wealth.donate.impact-heading")}
        >
          {impactHeading}
        </h2>
      ) : null}
      {impactBody.trim() ? (
        <p
          className="whitespace-pre-line"
          {...fieldAttr("wealth.donate.impact-body")}
        >
          {impactBody}
        </p>
      ) : null}
    </>
  );

  return (
    <>
      {/* ── donate.header — split hero ──────────────────────────────────── */}
      <WealthSplitHero
        ratio="sixty"
        image={heroImage}
        imageAlt={f["wealth.donate.hero-image-alt"] ?? ""}
        className="wealth-donate-hero"
        aria-labelledby="wealth-donate-h1"
        {...sectionGroupAttr("donate", "header")}
      >
        {eyebrow.trim() ? (
          <WealthReveal>
            <WealthEyebrow
              as="p"
              className="wealth-donate-eyebrow"
              {...fieldAttr("wealth.donate.header-eyebrow")}
            >
              {eyebrow}
            </WealthEyebrow>
          </WealthReveal>
        ) : null}
        <WealthReveal delay={1}>
          <h1
            id="wealth-donate-h1"
            className="wealth-hero__statement"
            {...fieldAttr("wealth.donate.header-heading")}
          >
            {heading}
          </h1>
        </WealthReveal>
        {body1.trim() ? (
          <>
            <WealthReveal delay={2}>
              <hr className="wealth-hero__rule" />
            </WealthReveal>
            <WealthReveal delay={3}>
              <p
                className="wealth-hero__excerpt"
                {...fieldAttr("wealth.donate.header-body-1")}
              >
                {body1}
              </p>
            </WealthReveal>
          </>
        ) : null}
      </WealthSplitHero>

      {/* ── donate.thank-you — shown only after a successful donation. Sits
         directly under the hero (a donor lands here from Stripe, so it must be
         above the fold); the paper strip keeps the forest card from touching
         the forest hero. ───── */}
      {showThankYou ? (
        <WealthBlock
          tone="paper"
          spacing="tight"
          container="narrow"
          {...sectionGroupAttr("donate", "thank-you")}
        >
          <div role="status" className="wealth-donate-thanks wealth-on-forest">
            <Heart aria-hidden="true" className="wealth-donate-thanks__icon" />
            <h2
              className="wealth-display"
              {...fieldAttr("wealth.donate.thank-you-heading")}
            >
              {thankYouHeading}
            </h2>
            {thankYouBody.trim() ? (
              <>
                <hr className="wealth-hero__rule" />
                <p
                  className="wealth-lead"
                  {...fieldAttr("wealth.donate.thank-you-body")}
                >
                  {thankYouBody}
                </p>
              </>
            ) : null}
          </div>
        </WealthBlock>
      ) : null}

      {/* ── Give — header-body-2 + form-heading, then the donation form ─── */}
      {showGive ? (
        <WealthBlock
          tone="surface"
          aria-labelledby={showFormHeading ? "wealth-donate-form-h" : undefined}
        >
          <div
            className={
              showCard && hasIntro
                ? "wealth-donate-give"
                : showCard
                  ? "wealth-donate-give wealth-donate-give--form-only"
                  : "wealth-donate-give wealth-donate-give--solo"
            }
          >
            {hasIntro ? (
              <WealthReveal className="wealth-donate-give__intro">
                {showFormHeading ? (
                  <div {...sectionGroupAttr("donate", "form")}>
                    <h2
                      id="wealth-donate-form-h"
                      className="wealth-h2"
                      {...fieldAttr("wealth.donate.form-heading")}
                    >
                      {formHeading}
                    </h2>
                  </div>
                ) : null}
                {body2.trim() ? (
                  <div {...sectionGroupAttr("donate", "header")}>
                    <p
                      className="wealth-lead"
                      {...fieldAttr("wealth.donate.header-body-2")}
                    >
                      {body2}
                    </p>
                  </div>
                ) : null}
              </WealthReveal>
            ) : null}

            {showCard ? (
              <div
                {...sectionGroupAttr("donate", "form")}
                className="wealth-donate-give__form"
              >
                <WealthDonateForm
                  label={label}
                  presetAmountsCents={
                    (business.donationPresetAmounts as number[] | null) ?? [
                      2000, 5000, 10000,
                    ]
                  }
                  headingId={
                    showFormHeading ? "wealth-donate-form-h" : undefined
                  }
                />
              </div>
            ) : null}
          </div>
        </WealthBlock>
      ) : null}

      {/* ── donate.impact — where your gift goes, hideable ──────────────── */}
      {showImpact ? (
        <WealthBlock
          tone="paper"
          aria-labelledby={
            impactHeading.trim() ? "wealth-donate-impact-h" : undefined
          }
          {...sectionGroupAttr("donate", "impact")}
        >
          {impactImage.trim() ? (
            <WealthOverlapCard
              image={impactImage}
              imageAlt={f["wealth.donate.impact-image-alt"] ?? ""}
              treatment="tint"
              tone="surface"
            >
              {impactCardContent}
            </WealthOverlapCard>
          ) : (
            <WealthReveal className="wealth-donate-impact-solo wealth-on-surface">
              {impactCardContent}
            </WealthReveal>
          )}
        </WealthBlock>
      ) : null}

      {/* ── donate.other-ways — Venmo / Cash App, hideable ──────────────── */}
      {showOtherWays ? (
        <WealthBlock
          tone="paper"
          spacing={showImpact ? "flush-top" : "default"}
          aria-labelledby="wealth-donate-ways-h"
          {...sectionGroupAttr("donate", "other-ways")}
        >
          <div className="wealth-section-head wealth-section-head--center">
            <h2
              id="wealth-donate-ways-h"
              className="wealth-h2"
              {...fieldAttr("wealth.donate.other-ways-heading")}
            >
              {otherWaysHeading}
            </h2>
          </div>
          <WealthReveal>
            <WealthDonateOtherWays
              handles={handles}
              logoUrl={business.siteContent?.logoUrl}
            />
          </WealthReveal>
        </WealthBlock>
      ) : null}

      {/* ── Empty state — reachable: the "donations" flag has no
         dependsOn, so a Venmo-less/Stripe-less store can still enable it
         and land here. Settings → Donations warns the owner when no
         payment lane is set up. ── */}
      {showEmpty ? (
        <WealthBlock tone="paper" container="narrow">
          <div className="wealth-donate-empty wealth-on-surface">
            <h2 className="wealth-h2">{label.noun}s aren&apos;t set up yet.</h2>
            <p className="wealth-muted">Check back soon.</p>
          </div>
        </WealthBlock>
      ) : null}
    </>
  );
}
