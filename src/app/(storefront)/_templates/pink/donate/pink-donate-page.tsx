import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { PinkEmptyState } from "../shared/pink-empty-state";
import { PinkPageHeader } from "../shared/pink-page-header";
import { PinkDonateForm } from "./pink-donate-form";
import { PinkDonateOtherWays } from "./pink-donate-other-ways";

const FIELD_KEYS = [
  "pink.donate.header-heading",
  "pink.donate.header-intro",
  "pink.donate.thank-you-heading",
  "pink.donate.thank-you-body",
  "pink.donate.form-heading",
  "pink.donate.other-ways-heading",
];

/**
 * PinkArt's styled Donate/Tip/Support page — the pilot restyle for the
 * Donations/Tips feature (docs at the orchestrating task level; every other
 * template still inherits `DefaultDonatePage`).
 *
 * Behavior contract is unchanged from `DefaultDonatePage`: the card section
 * only renders when `business.isStripeConnected && business.stripeChargesEnabled`
 * (mirroring the same gate `/checkout` and `/subscribe` use — a Stripe
 * account can be connected but still mid-onboarding), and "other ways to
 * give" only renders when `resolveDonationHandles(business)` is non-empty.
 * Only the presentation is pink's own: `PinkPageHeader` for the hero,
 * `--pink-*` tokens and `.pink-btn`/`.pink-input`/`.pink-label` for the
 * form, `PinkHairlineGrid` for the Venmo/Cash App cards.
 */
export function PinkDonatePage({
  business,
  status,
}: DefaultDonatePageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const label = resolveDonationLabel(business.donationLabel);
  const handles = resolveDonationHandles(business);
  // Both flags come from the connected Stripe account — see `DefaultDonatePage`
  // for the full rationale (mirrors `/checkout` and `/subscribe`'s gate).
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  const showOtherWays = handles.length > 0;
  const showThankYou = status === "success";

  // `f[...]` is always a string, never undefined — see `resolveFields` /
  // `resolveTemplateFields` — so the explicit blank check (not `??`/`||`)
  // matches `DefaultDonatePage`'s reasoning for the same fallback.
  const headerHeading = f["pink.donate.header-heading"] ?? "";
  const heading =
    headerHeading.trim().length > 0 ? headerHeading : label.pageTitle;
  const intro = f["pink.donate.header-intro"] ?? "";

  const thankYouHeadingField = f["pink.donate.thank-you-heading"] ?? "";
  const thankYouHeading =
    thankYouHeadingField.trim().length > 0
      ? thankYouHeadingField
      : "Thank you for your support!";

  const otherWaysHeadingField = f["pink.donate.other-ways-heading"] ?? "";
  const otherWaysHeading =
    otherWaysHeadingField.trim().length > 0
      ? otherWaysHeadingField
      : "Other ways to give";

  return (
    <>
      {/* ── donate.header ─────────────────────────────────────────────── */}
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: label.pageTitle }]}
        heading={heading}
        headingFieldKey="pink.donate.header-heading"
        intro={intro || undefined}
        introFieldKey="pink.donate.header-intro"
        sectionAttrs={sectionGroupAttr("donate", "header")}
      />

      <div className="mx-auto flex max-w-[720px] flex-col gap-10 px-5 py-16 md:px-10 md:py-24">
        {/* ── donate.thank-you ───────────────────────────────────────── */}
        {showThankYou && (
          <div
            role="status"
            className="flex flex-col gap-2 p-8 text-center"
            style={{
              background: "var(--pink-success-bg)",
              border: "1px solid var(--pink-success-border)",
            }}
          >
            <p
              className="pink-display"
              style={{
                fontSize: "22px",
                fontWeight: 600,
                letterSpacing: "-0.015em",
                color: "var(--pink-success)",
              }}
              {...fieldAttr("pink.donate.thank-you-heading")}
            >
              {thankYouHeading}
            </p>
            {f["pink.donate.thank-you-body"] && (
              <p
                className="text-[14px]"
                style={{ color: "var(--pink-muted)" }}
                {...fieldAttr("pink.donate.thank-you-body")}
              >
                {f["pink.donate.thank-you-body"]}
              </p>
            )}
          </div>
        )}

        {/* ── donate.form ────────────────────────────────────────────── */}
        {showCard && (
          <div {...sectionGroupAttr("donate", "form")}>
            {f["pink.donate.form-heading"] && (
              <h2
                className="pink-display mb-6"
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                }}
                {...fieldAttr("pink.donate.form-heading")}
              >
                {f["pink.donate.form-heading"]}
              </h2>
            )}
            <PinkDonateForm
              label={label}
              presetAmountsCents={
                (business.donationPresetAmounts as number[] | null) ??
                DEFAULT_DONATION_PRESETS_CENTS
              }
            />
          </div>
        )}

        {/* ── donate.other-ways ──────────────────────────────────────── */}
        {showOtherWays && (
          <div {...sectionGroupAttr("donate", "other-ways")}>
            <h2
              className="pink-display mb-6 text-center"
              style={{
                fontSize: "22px",
                fontWeight: 600,
                letterSpacing: "-0.015em",
              }}
              {...fieldAttr("pink.donate.other-ways-heading")}
            >
              {otherWaysHeading}
            </h2>
            <PinkDonateOtherWays handles={handles} />
          </div>
        )}

        {/* ── Empty state — should be unreachable while the "donations"
            flag is on, since the settings UI requires at least one lane to
            be configured before it can be enabled. Kept as a safety net for
            a business that had every lane removed after the fact (mirrors
            `DefaultDonatePage`). ── */}
        {!showCard && !showOtherWays && (
          <PinkEmptyState
            heading={`${label.noun}s aren't set up yet.`}
            body="Check back soon."
          />
        )}
      </div>
    </>
  );
}
