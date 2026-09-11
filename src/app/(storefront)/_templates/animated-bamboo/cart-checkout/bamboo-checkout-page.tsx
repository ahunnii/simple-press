import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { cn } from "~/lib/utils";

import { BambooEdge } from "../shared/bamboo-edge";
import { BambooReveal } from "../shared/bamboo-reveal";
import { CheckoutForm } from "./bamboo-checkout-form";
import { BambooCheckoutUnavailable } from "./bamboo-checkout-unavailable";

export async function BambooCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  // Defensive: `checkout/page.tsx` already routes to `t.CheckoutUnavailable`
  // when Stripe isn't connected (outside development). Reuse the same
  // component so the two paths can never drift apart. It renders its own
  // footer edge.
  if (!business.isStripeConnected) {
    return <BambooCheckoutUnavailable />;
  }

  // Fragment keeps the edge a direct sibling of the section under <main> (a
  // column flex container), so its mt-auto pins the edge to the bottom of
  // main.
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
        <BambooReveal>
          <div className="mb-10">
            <Link
              href="/cart"
              className={cn(
                "bamboo-swipe",
                "inline-flex items-center gap-1.5 text-[0.95rem] text-[var(--bamboo-ink-soft)]",
              )}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Cart
            </Link>
            <h1 className="font-heading mt-5 text-[clamp(2.1rem,4.4vw,3.2rem)] leading-[1.06] font-bold tracking-tight text-[var(--bamboo-pine)]">
              Checkout
            </h1>
          </div>
        </BambooReveal>

        {/* No reveal wrapper around the form itself — nothing that hides or
            transforms a required control may sit between the shopper and
            submit (see the e2e contract in the redesign plan). */}
        <CheckoutForm business={business} merchantPolicies={merchantPolicies} />
      </section>
      <BambooEdge from="paper" to="pine" variant="c" />
    </>
  );
}
