"use client";

import Link from "next/link";

import { cn } from "~/lib/utils";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { useCart } from "~/providers/cart-context";

import {
  SLEDGE_PAGE_CONTAINER,
  SLEDGE_PAGE_CONTENT_PADDING,
  SledgeEmptyState,
  SledgePageHeader,
} from "../shared/sledge-page-layout";
import { SledgeCheckoutForm } from "./sledge-checkout-form";

type Props = {
  business: Parameters<typeof SledgeCheckoutForm>[0]["business"];
  merchantPolicies: Parameters<
    typeof SledgeCheckoutForm
  >[0]["merchantPolicies"];
};

export function SledgeCheckoutContents({ business, merchantPolicies }: Props) {
  const { items } = useCart();
  const itemLabel = `${items.length} ${items.length === 1 ? "item" : "items"}`;

  if (items.length === 0) {
    return (
      <PageTransition>
        <SledgePageHeader
          title="Checkout"
          backLink={{ href: "/cart", label: "Back to Cart" }}
        />
        <div className={cn(SLEDGE_PAGE_CONTAINER, "pb-16 md:pb-20")}>
          <SledgeEmptyState
            bare
            className="py-20"
            message="Your cart is empty. Add items before checking out."
            action={
              <Link href="/shop" className="sl-btn text-xs">
                Browse Shop →
              </Link>
            }
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <SledgePageHeader
        title="Checkout"
        intro="Complete your details below — you'll confirm payment securely with Stripe."
        backLink={{ href: "/cart", label: "Back to Cart" }}
        meta={
          <p className="sl-eyebrow mt-3 font-sans text-xs tracking-[0.14em] uppercase">
            {itemLabel} in cart
          </p>
        }
      />

      <section
        className={cn(SLEDGE_PAGE_CONTAINER, SLEDGE_PAGE_CONTENT_PADDING)}
      >
        <FadeIn delay={0.08}>
          <SledgeCheckoutForm
            business={business}
            merchantPolicies={merchantPolicies}
          />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
