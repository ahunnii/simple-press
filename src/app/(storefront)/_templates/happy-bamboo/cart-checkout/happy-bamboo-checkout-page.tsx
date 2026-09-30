// "use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { Button } from "~/components/ui/button";
// import { useCart } from "~/providers/cart-context";

import { FadeIn, PageTransition } from "~/components/page-animations";

import { HappyBambooCheckoutForm } from "./happy-bamboo-checkout-form";
import { HappyBambooCheckoutUnavailable } from "./happy-bamboo-checkout-unavailable";

export async function HappyBambooCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  //   const { items } = useCart();
  // `checkout/page.tsx` already renders `t.CheckoutUnavailable` (no props)
  // outside development; this guard also covers development and hands the
  // already-loaded `customFields` down so the screen doesn't re-fetch.
  if (!business.isStripeConnected) {
    return (
      <HappyBambooCheckoutUnavailable
        customFields={business.siteContent?.customFields}
      />
    );
  }

  //   if (items.length === 0) {
  //     return (
  //       <PageTransition>
  //         <section className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 text-center lg:px-8">
  //           <FadeIn direction="up">
  //             <h1 className="text-foreground font-heading text-2xl font-bold">
  //               Nothing to checkout
  //             </h1>
  //             <p className="text-muted-foreground mt-2">
  //               Add some products to your cart before proceeding to checkout.
  //             </p>
  //             <Button className="mt-6" asChild>
  //               <Link href="/shop">Browse Products</Link>
  //             </Button>
  //           </FadeIn>
  //         </section>
  //       </PageTransition>
  //     );
  //   }

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
                <ArrowLeft className="size-4" />
                Back to Cart
              </Link>
            </Button>
            <h1 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl">
              Checkout
            </h1>
          </div>
        </FadeIn>
        <FadeIn direction="up" delay={0.1}>
          <HappyBambooCheckoutForm
            business={business}
            merchantPolicies={merchantPolicies}
          />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
