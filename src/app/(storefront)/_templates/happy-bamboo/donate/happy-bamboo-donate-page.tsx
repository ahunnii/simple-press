import { CheckCircle2, HeartHandshake } from "lucide-react";

import type { DefaultDonatePageTemplateProps } from "../../types";
import { resolveDonationHandles } from "~/lib/donation-handles";
import { DEFAULT_DONATION_PRESETS_CENTS } from "~/lib/donations/constants";
import { resolveDonationLabel } from "~/lib/donations/label";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { FadeIn, PageTransition } from "~/components/page-animations";

// Default's resolver: this page keeps reading the existing `default.donate.*`
// keys, and Default's field map owns their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { HappyBambooPageShelf } from "../shared/happy-bamboo-page-shelf";
import { HappyBambooDonateForm } from "./happy-bamboo-donate-form";
import { HappyBambooDonateOtherWays } from "./happy-bamboo-donate-other-ways";

/**
 * `/donate` — happy-bamboo's Donate/Tip/Support page on the shared page
 * shelf, following `PinkDonatePage`'s structure (header → thank-you → card
 * form → other ways → nothing-configured fallback). The behavior contract is
 * Default's donate page's:
 * - the card form only renders when `business.isStripeConnected &&
 *   business.stripeChargesEnabled` (the same gate `/checkout` and
 *   `/subscribe` use — an account can be connected but still mid-onboarding);
 * - "Other ways to give" only renders when `resolveDonationHandles(business)`
 *   is non-empty and the `donate.other-ways` section isn't hidden;
 * - `?status=success` shows the thank-you banner;
 * - the "nothing configured" state is kept as a safety net.
 * "Other ways to give" is the page's ending band.
 */
export function HappyBambooDonatePage({
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
  // Both flags come from the connected Stripe account — see Default's donate
  // page for the full rationale (mirrors `/checkout` and `/subscribe`).
  const showCard = business.isStripeConnected && business.stripeChargesEnabled;
  // `showOtherWays` alone drives the "nothing configured" state below — a
  // section the owner has merely hidden still counts as configured, so
  // `isSectionVisible` only gates the band's render (same split as Default).
  const showOtherWays = handles.length > 0;
  const otherWaysVisible =
    showOtherWays &&
    isSectionVisible(customFields, "happy-bamboo", "donate.other-ways");
  const showThankYou = status === "success";

  // The heading field has no static `defaultValue` — it falls back to the
  // business's resolved donation label (Donate / Leave a Tip / Support Us).
  const heading =
    (f["default.donate.hero-heading"] ?? "").trim() || label.pageTitle;
  const thankYouHeading =
    (f["default.donate.thank-you-heading"] ?? "").trim() ||
    "Thank you for your support!";
  const thankYouBody = f["default.donate.thank-you-body"] ?? "";
  const otherWaysHeading =
    (f["default.donate.other-ways-heading"] ?? "").trim() ||
    "Other ways to give";

  const showEmpty = !showCard && !showOtherWays;
  // With only other-ways configured (no banner, no card) the body would be an
  // empty padded gap between the shelf and the other-ways band.
  const showMain = showThankYou || showCard || showEmpty;

  return (
    <PageTransition>
      <HappyBambooPageShelf
        title={heading}
        titleFieldKey="default.donate.hero-heading"
        subtitle={f["default.donate.hero-intro"]}
        subtitleFieldKey="default.donate.hero-intro"
        sectionAttrs={sectionGroupAttr("donate", "hero")}
      />

      {showMain && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="flex max-w-2xl flex-col gap-10">
              {/* Thank-you banner — a live status, so never behind a
                  reveal. */}
              {showThankYou && (
                <div
                  role="status"
                  className="border-primary/20 bg-primary/5 flex flex-col items-start gap-3 rounded-2xl border p-6 sm:p-8"
                  {...sectionGroupAttr("donate", "thank-you")}
                >
                  <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
                    <CheckCircle2
                      className="text-primary size-6"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-2xl font-bold text-balance">
                    <span
                      className="font-serif"
                      {...fieldAttr("default.donate.thank-you-heading")}
                    >
                      {thankYouHeading}
                    </span>
                  </p>
                  {!!thankYouBody && (
                    <p
                      className="text-muted-foreground leading-relaxed"
                      {...fieldAttr("default.donate.thank-you-body")}
                    >
                      {thankYouBody}
                    </p>
                  )}
                </div>
              )}

              {/* Card / Stripe Checkout form — never inside a FadeIn: a form
                  must not start hidden. No sectionGroupAttr: "donate.form"
                  isn't a declared field group (amount/label come from
                  Donation settings), same as Default's donate page. */}
              {showCard && (
                <HappyBambooDonateForm
                  label={label}
                  presetAmountsCents={
                    (business.donationPresetAmounts as number[] | null) ??
                    DEFAULT_DONATION_PRESETS_CENTS
                  }
                />
              )}

              {/* Nothing configured — should be unreachable while the
                  "donations" flag is on (settings require at least one lane
                  before it can be enabled). Kept as a safety net for a
                  business that had every lane removed after the fact
                  (mirrors Default's donate page). */}
              {showEmpty && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <HeartHandshake
                    className="text-muted-foreground/50 mb-4 h-12 w-12"
                    aria-hidden="true"
                  />
                  <p className="text-muted-foreground text-lg">
                    {label.noun}s aren&apos;t set up yet.
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Check back soon.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Other ways to give: Venmo / Cash App — the page's ending band. On
          the muted band after the body; on the page background when it
          follows the shelf directly, so the two don't merge. */}
      {otherWaysVisible && (
        <section
          className={cn("py-16 md:py-24", showMain && "bg-muted/50")}
          {...sectionGroupAttr("donate", "other-ways")}
        >
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="mb-10 font-serif text-2xl font-bold md:text-3xl">
                <span
                  className="font-serif"
                  {...fieldAttr("default.donate.other-ways-heading")}
                >
                  {otherWaysHeading}
                </span>
              </h2>
              <HappyBambooDonateOtherWays
                handles={handles}
                logoUrl={business.siteContent?.logoUrl}
              />
            </FadeIn>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
