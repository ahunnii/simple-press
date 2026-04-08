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

import { NoiseCartItem } from "./noise-cart-item";
import { NoiseCartSummary } from "./noise-cart-summary";

type Props = {
  business: {
    id: string;
    shippingType: string;
    shippingFlatRate: number | null;
    freeShippingThreshold: number | null;
    offersInStorePickup: boolean;
    siteContent: { primaryColor: string | null } | null;
  };
};

export function NoiseCartContents({ business }: Props) {
  const { items } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);

  if (items.length === 0) {
    return (
      <PageTransition>
        <section className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-32 text-center lg:px-8">
          <FadeIn direction="up">
            <div className="mx-auto flex size-20 items-center justify-center border border-border">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <h1 className="mt-8 font-serif text-3xl font-light text-foreground">
              Your cart is empty
            </h1>
            <p className="mx-auto mt-3 max-w-sm font-sans text-sm text-muted-foreground">
              Browse the collection and add pieces you love.
            </p>
            <Button
              className="mt-8 rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
              size="lg"
              asChild
            >
              <Link href="/shop">Shop the Collection</Link>
            </Button>
          </FadeIn>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <FadeIn>
          <h1 className="mb-10 font-serif text-4xl font-light text-foreground">
            Your Cart
          </h1>
        </FadeIn>
        <div className="flex flex-col gap-10 lg:flex-row">
          <StaggerContainer className="flex flex-1 flex-col" staggerDelay={0.06}>
            {items.map((item) => (
              <StaggerItem key={item.productId}>
                <NoiseCartItem item={item} />
              </StaggerItem>
            ))}
            <StaggerItem>
              <div className="mt-6">
                <Button
                  variant="outline"
                  asChild
                  className="rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
                >
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
              </div>
            </StaggerItem>
          </StaggerContainer>

          <FadeIn direction="left" delay={0.2} className="w-full shrink-0 lg:w-80">
            <div className="sticky top-20">
              <NoiseCartSummary shippingConfig={shippingConfig} />
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
