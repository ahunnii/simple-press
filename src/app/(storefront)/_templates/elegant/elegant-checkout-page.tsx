import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../types";

import { ElegantCheckoutForm } from "./elegant-checkout-form";

export async function ElegantCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-md text-center">
          <span className="text-primary mb-4 block text-sm tracking-[0.3em] uppercase">
            Checkout
          </span>
          <h1 className="text-foreground mb-4 font-serif text-3xl">
            Checkout Unavailable
          </h1>
          <p className="text-muted-foreground mb-8">
            This store hasn&apos;t set up payment processing yet. Please contact
            the store owner.
          </p>
          <Link
            href="/shop"
            className="bg-primary text-primary-foreground boty-transition hover:bg-primary/90 boty-shadow inline-flex items-center justify-center rounded-full px-8 py-3 text-sm tracking-wide"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="mb-10">
        <Link
          href="/cart"
          className="text-muted-foreground boty-transition hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Link>
        <span className="text-primary mt-4 block text-sm tracking-[0.3em] uppercase">
          Secure Checkout
        </span>
        <h1 className="text-foreground font-serif text-4xl font-semibold md:text-5xl">
          Checkout
        </h1>
      </div>

      <ElegantCheckoutForm business={business} />
    </section>
  );
}
