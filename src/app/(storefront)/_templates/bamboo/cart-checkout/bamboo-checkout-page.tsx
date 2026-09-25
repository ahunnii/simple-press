import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { Button } from "~/components/ui/button";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { BambooCheckoutUnavailable } from "./bamboo-checkout-unavailable";
import { CheckoutForm } from "./bamboo-checkout-form";

/**
 * `checkout/page.tsx` already renders `t.CheckoutUnavailable` (no props)
 * when the store has no Stripe account outside development — see the guard
 * there at `src/app/(storefront)/checkout/page.tsx:16-17`. This guard is
 * belt-and-suspenders for any caller that reaches this component anyway,
 * matching olive's `OliveCheckoutPage` pattern, and hands the already-loaded
 * `customFields` down so the unavailable screen doesn't have to re-fetch the
 * tenant.
 */
export async function BambooCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected && process.env.NODE_ENV !== "development") {
    return (
      <BambooCheckoutUnavailable
        customFields={business.siteContent?.customFields}
      />
    );
  }

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <FadeIn direction="up">
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground mb-4 gap-1"
            >
              <Link href="/cart">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Cart
              </Link>
            </Button>
            <h1 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl">
              Checkout
            </h1>
          </div>
        </FadeIn>
        <FadeIn direction="up" delay={0.1}>
          <CheckoutForm
            business={business}
            merchantPolicies={merchantPolicies}
          />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
