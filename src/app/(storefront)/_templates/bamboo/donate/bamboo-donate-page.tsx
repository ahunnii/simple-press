import { CheckCircle2, HeartHandshake } from "lucide-react";

import type { DefaultDonatePageTemplateProps } from "../../types";
import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
// Default's resolver, not bamboo's: this page keeps reading the existing
// `default.donate.*` keys, and only Default's field map knows their
// `defaultValue`s — bamboo's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import { BambooPageHero } from "../shared/bamboo-page-hero";
import { BambooDonateForm } from "./bamboo-donate-form";
import { BambooDonateOtherWays } from "./bamboo-donate-other-ways";

/** Gold-ringed icon disc — the contact success card's treatment. */
const ICON_DISC =
  "flex size-16 items-center justify-center rounded-full border border-[var(--bam-gold)]/40 bg-[var(--bam-gold)]/10";

/**
 * `/donate` — bamboo's Donate/Tip/Support page on the generic page's base:
 * the shared `BambooPageHero` band (carries `BAMBOO_TOP_MARKER`; heading +
 * intro) over a cream section on the band's container edge (B1.2/B1.7). With
 * both a card form and Venmo/Cash App handles, the page takes the contact
 * page's composition — form left, "other ways" as a side rail right; the
 * rail drops under the form below lg. Without the card form, the other ways
 * take the main column.
 *
 * Behavior contract is Default's donate page's, unchanged: the card form
 * renders only when `business.isStripeConnected &&
 * business.stripeChargesEnabled` (the same gate `/checkout` and `/subscribe`
 * use — an account can be connected but still mid-onboarding); "other ways to
 * give" renders only when `resolveDonationHandles(business)` is non-empty and
 * `donate.other-ways` isn't hidden; `?status=success` shows the thank-you
 * banner; and the "nothing configured" state is kept as a safety net. Copy is
 * Default's `default.donate.*` fields read through Default's resolver.
 */
export function BambooDonatePage({
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
  // Generic-base parity: the site-wide page-hero photo applies here exactly
  // as it does on generic CMS pages (no per-page override field).
  const heroBgImage = resolveFields(customFields, [
    "bamboo.global.page-hero-bg-image",
  ])["bamboo.global.page-hero-bg-image"];

  const label = resolveDonationLabel(business.donationLabel);
  const handles = resolveDonationHandles(business);
  // Both flags come from the connected Stripe account — see Default's donate
  // page for the full rationale (mirrors `/checkout` and `/subscribe`).
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  // `showOtherWays` alone drives the "no lanes configured" empty state below
  // — a section the owner has merely hidden still counts as "configured",
  // so `isSectionVisible` only gates the block's actual render, not the
  // empty-state fallback (same split as Default's donate page).
  const showOtherWays = handles.length > 0;
  const otherWaysVisible =
    showOtherWays &&
    isSectionVisible(customFields, "bamboo", "donate.other-ways");
  const showThankYou = status === "success";
  const showEmpty = !showCard && !showOtherWays;
  const hasRail = showCard && otherWaysVisible;
  const showMain = showThankYou || showCard || otherWaysVisible || showEmpty;

  // `f[...]` is always a string (see `resolveTemplateFields`) and this field
  // has no static `defaultValue` — a blank heading falls back to the
  // business's resolved donation label (same logic as Default's page).
  const heroHeading = f["default.donate.hero-heading"] ?? "";
  const heading = heroHeading.trim().length > 0 ? heroHeading : label.pageTitle;

  const otherWays = (layout: "stack" | "grid") => (
    <OtherWaysBlock
      heading={
        (f["default.donate.other-ways-heading"] ?? "") || "Other ways to give"
      }
      handles={handles}
      logoUrl={business.siteContent?.logoUrl}
      layout={layout}
    />
  );

  return (
    <PageTransition>
      <BambooPageHero
        sectionAttrs={sectionGroupAttr("donate", "hero")}
        title={heading}
        titleFieldKey="default.donate.hero-heading"
        lede={f["default.donate.hero-intro"]}
        ledeFieldKey="default.donate.hero-intro"
        bgImage={heroBgImage}
      />

      {showMain && (
        // Cream body — declares no background.
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div
              className={cn(
                hasRail &&
                  "grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16",
              )}
            >
              <div
                className={cn(
                  "flex max-w-3xl flex-col gap-10",
                  hasRail && "lg:col-span-7",
                )}
              >
                {/* ── Thank-you banner — a live status, so never behind a
                    reveal. ── */}
                {showThankYou && (
                  <div
                    role="status"
                    className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--bam-gold)]/40 bg-[var(--bam-cream-deep)] px-6 py-10 text-center sm:px-10"
                    {...sectionGroupAttr("donate", "thank-you")}
                  >
                    <div className={ICON_DISC}>
                      <CheckCircle2
                        className="size-8 text-[var(--bam-forest)]"
                        aria-hidden="true"
                      />
                    </div>
                    <p
                      className="text-foreground mt-2 font-serif text-2xl font-bold tracking-tight text-balance md:text-3xl"
                      {...fieldAttr("default.donate.thank-you-heading")}
                    >
                      {(f["default.donate.thank-you-heading"] ?? "") ||
                        "Thank you for your support!"}
                    </p>
                    {f["default.donate.thank-you-body"] ? (
                      <p
                        className="text-muted-foreground max-w-xl leading-relaxed"
                        {...fieldAttr("default.donate.thank-you-body")}
                      >
                        {f["default.donate.thank-you-body"]}
                      </p>
                    ) : null}
                  </div>
                )}

                {/* ── Card / Stripe Checkout form — never inside a FadeIn: a
                    form must not start hidden. No sectionGroupAttr:
                    "donate.form" isn't a declared field group (amount/label
                    come from Donation settings), same as Default's page. ── */}
                {showCard && (
                  <BambooDonateForm
                    label={label}
                    presetAmountsCents={
                      (business.donationPresetAmounts as number[] | null) ??
                      DEFAULT_DONATION_PRESETS_CENTS
                    }
                  />
                )}

                {/* ── Other ways in the main column when there's no card
                    form to sit beside. ── */}
                {!showCard && otherWaysVisible && otherWays("grid")}

                {/* ── Empty state — should be unreachable while the
                    "donations" flag is on, since the settings UI requires at
                    least one lane before it can be enabled. Kept as a safety
                    net for a business that had every lane removed after the
                    fact (mirrors Default's donate page). ── */}
                {showEmpty && (
                  <FadeIn direction="up">
                    <div className="bg-card flex flex-col items-center rounded-2xl border border-[var(--bam-hairline)] px-6 py-16 text-center md:py-20">
                      <div className={ICON_DISC}>
                        <HeartHandshake
                          className="size-7 text-[var(--bam-forest)]"
                          aria-hidden="true"
                        />
                      </div>
                      <h2 className="text-foreground mt-6 text-xl font-semibold">
                        {label.noun}s aren&apos;t set up yet.
                      </h2>
                      <p className="text-muted-foreground mt-2">
                        Check back soon.
                      </p>
                    </div>
                  </FadeIn>
                )}
              </div>

              {/* ── Side rail: other ways beside the card form. ── */}
              {hasRail && (
                <div className="lg:col-span-5">{otherWays("stack")}</div>
              )}
            </div>
          </div>
        </section>
      )}
    </PageTransition>
  );
}

function OtherWaysBlock({
  heading,
  handles,
  logoUrl,
  layout,
}: {
  heading: string;
  handles: ResolvedDonationHandle[];
  logoUrl?: string | null;
  layout: "stack" | "grid";
}) {
  return (
    <div {...sectionGroupAttr("donate", "other-ways")}>
      <FadeIn direction="up">
        <h2 className="text-foreground mb-8 font-serif text-2xl font-bold tracking-tight md:text-3xl">
          <span
            className="text-balance"
            {...fieldAttr("default.donate.other-ways-heading")}
          >
            {heading}
          </span>
        </h2>
        <BambooDonateOtherWays
          handles={handles}
          logoUrl={logoUrl}
          layout={layout}
        />
      </FadeIn>
    </div>
  );
}
