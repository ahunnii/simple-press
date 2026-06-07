import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { Button } from "~/components/ui/button";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { CheckoutForm } from "./bamboo-checkout-form";

export async function BambooCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected) {
    return (
      <PageTransition>
        <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-foreground p-4">
          <div className="max-w-md text-center">
            <h1 className="text-background mb-4 text-2xl font-bold">
              Checkout Unavailable
            </h1>
            <p className="text-background/70">
              This store hasn&apos;t set up payment processing yet. Please
              contact the store owner.
            </p>
          </div>
        </div>
      </PageTransition>
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
