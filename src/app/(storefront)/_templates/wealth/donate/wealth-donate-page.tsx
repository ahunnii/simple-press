import Image from "next/image";

import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthH1 } from "../shared/wealth-h1";
import { WealthSection } from "../shared/wealth-section";
import { WealthSectionHeading } from "../shared/wealth-section-heading";
import { WealthDonateForm } from "./wealth-donate-form";
import { WealthDonateOtherWays } from "./wealth-donate-other-ways";

const FIELD_KEYS = [
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

/**
 * Wealth's styled Donate page — DCWF's "Support DCWF" page (the live
 * Squarespace site used a Donorbox iframe; this rebuilds it entirely on the
 * platform's donations flow).
 *
 * FUNCTIONALITY mirrors `PinkDonatePage`/`DefaultDonatePage` exactly: the
 * form only renders when `business.isStripeConnected &&
 * business.stripeChargesEnabled` (same gate `/checkout` and `/subscribe`
 * use), "other ways to give" only renders when
 * `resolveDonationHandles(business)` is non-empty, and the thank-you banner
 * only renders for `status === "success"`. Only the presentation and the
 * two-column header/impact layout are wealth's own, per design.md's
 * "Donate (Support DCWF)" section concepts.
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
  const showOtherWays = handles.length > 0;
  const showThankYou = status === "success";
  const showImpact = isSectionVisible(customFields, "wealth", "donate.impact");

  // `f[...]` is always a string, never undefined — see `resolveFields` /
  // `resolveTemplateFields` — so the explicit blank check (not `??`/`||`)
  // matches `PinkDonatePage`'s reasoning for the same fallback.
  const headerHeadingField = f["wealth.donate.header-heading"] ?? "";
  const heading =
    headerHeadingField.trim().length > 0 ? headerHeadingField : label.pageTitle;

  const thankYouHeadingField = f["wealth.donate.thank-you-heading"] ?? "";
  const thankYouHeading =
    thankYouHeadingField.trim().length > 0
      ? thankYouHeadingField
      : "Thank you for supporting worker-ownership.";

  const otherWaysHeadingField = f["wealth.donate.other-ways-heading"] ?? "";
  const otherWaysHeading =
    otherWaysHeadingField.trim().length > 0
      ? otherWaysHeadingField
      : "Other ways to give";

  const impactImage = f["wealth.donate.impact-image"] ?? "";

  const formHeadingField = f["wealth.donate.form-heading"] ?? "";
  const formHeading =
    formHeadingField.trim().length > 0 ? formHeadingField : undefined;

  return (
    <>
      {/* ── donate.header + donate.form — 2-col: left copy, right form ──── */}
      <WealthSection className="pt-[calc(var(--wealth-rhythm)*1.5)]">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div {...sectionGroupAttr("donate", "header")} className="flex flex-col gap-5">
            <WealthEyebrow as="p" {...fieldAttr("wealth.donate.header-eyebrow")}>
              {f["wealth.donate.header-eyebrow"]}
            </WealthEyebrow>
            <WealthH1
              className="italic text-[clamp(28px,4.5vw,35px)] leading-[1.3]"
              {...fieldAttr("wealth.donate.header-heading")}
            >
              {heading}
            </WealthH1>
            {f["wealth.donate.header-body-1"] && (
              <p
                style={{ color: "var(--wealth-ink)" }}
                {...fieldAttr("wealth.donate.header-body-1")}
              >
                {f["wealth.donate.header-body-1"]}
              </p>
            )}
            {f["wealth.donate.header-body-2"] && (
              <p
                style={{ color: "var(--wealth-ink)" }}
                {...fieldAttr("wealth.donate.header-body-2")}
              >
                {f["wealth.donate.header-body-2"]}
              </p>
            )}
          </div>

          {showCard && (
            <div {...sectionGroupAttr("donate", "form")}>
              <WealthDonateForm
                label={label}
                presetAmountsCents={
                  (business.donationPresetAmounts as number[] | null) ?? [
                    2000, 5000, 10000,
                  ]
                }
                formHeading={formHeading}
                formHeadingFieldKey="wealth.donate.form-heading"
              />
            </div>
          )}
        </div>
      </WealthSection>

      {/* ── donate.impact — wealth addition, hideable ───────────────────── */}
      {showImpact && (
        <WealthSection sectionAttrs={sectionGroupAttr("donate", "impact")}>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-4">
              <WealthSectionHeading {...fieldAttr("wealth.donate.impact-heading")}>
                {f["wealth.donate.impact-heading"]}
              </WealthSectionHeading>
              <p
                style={{ color: "var(--wealth-ink)" }}
                {...fieldAttr("wealth.donate.impact-body")}
              >
                {f["wealth.donate.impact-body"]}
              </p>
            </div>
            {impactImage && (
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={impactImage}
                  alt={f["wealth.donate.impact-image-alt"] ?? ""}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </WealthSection>
      )}

      {/* ── donate.thank-you — shown only after a successful donation ───── */}
      {showThankYou && (
        <WealthSection>
          <div
            role="status"
            className="mx-auto flex max-w-[640px] flex-col gap-2 p-8 text-center"
            style={{
              background: "var(--wealth-success-bg)",
              border: "1px solid var(--wealth-success-border)",
            }}
            {...sectionGroupAttr("donate", "thank-you")}
          >
            <p
              className="wealth-section-heading"
              style={{ color: "var(--wealth-success)" }}
              {...fieldAttr("wealth.donate.thank-you-heading")}
            >
              {thankYouHeading}
            </p>
            {f["wealth.donate.thank-you-body"] && (
              <p
                className="text-[14px]"
                style={{ color: "var(--wealth-muted)" }}
                {...fieldAttr("wealth.donate.thank-you-body")}
              >
                {f["wealth.donate.thank-you-body"]}
              </p>
            )}
          </div>
        </WealthSection>
      )}

      {/* ── donate.other-ways — Venmo / Cash App, hideable ──────────────── */}
      {showOtherWays && (
        <WealthSection sectionAttrs={sectionGroupAttr("donate", "other-ways")}>
          <WealthSectionHeading
            as="h2"
            className="mb-8 text-center"
            {...fieldAttr("wealth.donate.other-ways-heading")}
          >
            {otherWaysHeading}
          </WealthSectionHeading>
          <WealthDonateOtherWays
            handles={handles}
            logoUrl={business.siteContent?.logoUrl}
          />
        </WealthSection>
      )}

      {/* ── Empty state — should be unreachable while the "donations" flag
          is on, since the settings UI requires at least one lane to be
          configured before it can be enabled. Kept as a safety net for a
          business that had every lane removed after the fact (mirrors
          `PinkDonatePage`/`DefaultDonatePage`). ── */}
      {!showCard && !showOtherWays && (
        <WealthSection>
          <div
            className="py-24 text-center"
            style={{ border: "1px solid var(--wealth-surface-2)" }}
          >
            <p className="wealth-section-heading">
              {label.noun}s aren&apos;t set up yet.
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--wealth-muted)" }}>
              Check back soon.
            </p>
          </div>
        </WealthSection>
      )}
    </>
  );
}
