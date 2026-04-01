// "use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../types";
import { Button } from "~/components/ui/button";

// import { useCart } from "~/providers/cart-context";

import { CheckoutForm } from "./bamboo-checkout-form";
import { FadeIn, PageTransition } from "./happy-bamboo-animations";

export async function HappyBambooCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  //   const { items } = useCart();
  // Check if Stripe is connected
  if (!business.isStripeConnected) {
    return (
      <PageTransition>
        <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-[#1A1A1A] p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold text-white">
              Checkout Unavailable
            </h1>
            <p className="text-white/70">
              This store hasn&apos;t set up payment processing yet. Please
              contact the store owner.
            </p>
          </div>
        </div>
      </PageTransition>
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
            <h1 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
              Checkout
            </h1>
          </div>
        </FadeIn>
        <FadeIn direction="up" delay={0.1}>
          <CheckoutForm business={business} />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
