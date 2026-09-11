"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { Button } from "~/components/ui/button";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { useCart } from "~/providers/cart-context";

import { BambooCartItem } from "./bamboo-cart-item";
import { BambooCartSummary } from "./bamboo-cart-summary";

type Props = {
  business: {
    id: string;
    shippingType: string;
    shippingFlatRate: number | null;
    freeShippingThreshold: number | null;
    offersInStorePickup: boolean;
    siteContent: {
      primaryColor: string | null;
    } | null;
  };
};

export function BambooCartContents({ business }: Props) {
  const { items } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);

  if (items.length === 0) {
    return (
      <PageTransition>
        <section className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 text-center lg:px-8">
          <FadeIn direction="up">
            <div
              className="bg-primary/10 mx-auto flex size-20 items-center justify-center rounded-full"
              aria-hidden="true"
            >
              <ShoppingBag className="text-primary size-8" />
            </div>
            <h1 className="text-foreground font-heading mt-6 text-2xl font-bold">
              Your cart is empty
            </h1>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md">
              Looks like you have not added anything to your cart yet. Explore
              our collection of premium products.
            </p>
            <Button
              className="mt-8 rounded-full bg-[var(--bam-forest)] text-[var(--bam-cream)] hover:bg-[var(--bam-forest-deep)]"
              size="lg"
              asChild
            >
              <Link href="/shop">Continue Shopping</Link>
            </Button>
          </FadeIn>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <FadeIn direction="up">
          <h1 className="text-foreground mb-8 font-serif text-3xl font-bold tracking-tight md:text-4xl">
            Your Cart
          </h1>
        </FadeIn>
        <div className="flex flex-col gap-8 lg:flex-row">
          <StaggerContainer
            className="flex flex-1 flex-col gap-4"
            staggerDelay={0.08}
          >
            {items.map((item) => (
              <StaggerItem key={item.productId}>
                <BambooCartItem item={item} />
              </StaggerItem>
            ))}
            <StaggerItem>
              <div className="mt-2">
                <Button
                  variant="outline"
                  asChild
                  className="rounded-full border-[var(--bam-forest)] text-[var(--bam-forest)] hover:bg-[var(--bam-cream-deep)] hover:text-[var(--bam-forest-deep)]"
                >
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
              </div>
            </StaggerItem>
          </StaggerContainer>
          <FadeIn
            direction="left"
            delay={0.2}
            className="w-full shrink-0 lg:w-80"
          >
            <div className="sticky top-20">
              <BambooCartSummary shippingConfig={shippingConfig} />
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
