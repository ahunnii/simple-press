"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  getAmountUntilFreeShipping,
  getFreeShippingProgress,
  SHIPPING_TYPES,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { useCart } from "~/providers/cart-context";

import { PollenCartItem } from "./pollen-cart-item";

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

export function PollenCartContents({ business }: Props) {
  const { items, subtotal, itemCount } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const shipping = calculateShipping(subtotal, shippingConfig);
  const estimatedTotal = subtotal + shipping;
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const showProgress =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null;

  if (items.length === 0) {
    return (
      <PageTransition>
        <section className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-40 text-center sm:px-6 lg:px-8">
          <FadeIn direction="up">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#f5f2ee]">
              <ShoppingBag className="size-8 text-[#4c566a]" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-[#2a351f]">
              Your cart is empty
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[#4c566a]">
              Looks like you haven&apos;t added anything to your cart yet.
            </p>
            <Button
              className="mt-8 bg-[#215935] text-white hover:bg-[#1a4729]"
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
      <section className="mx-auto max-w-7xl px-4 py-40 sm:px-6 lg:px-8">
        <FadeIn direction="up">
          <h1 className="mb-8 text-3xl font-bold text-[#2a351f] md:text-4xl">
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
                <PollenCartItem item={item} />
              </StaggerItem>
            ))}
            <StaggerItem>
              <div className="mt-2">
                <Button
                  variant="outline"
                  asChild
                  className="border-[#2a351f]/20 text-[#2a351f] hover:border-[#215935] hover:text-[#215935]"
                >
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
              </div>
            </StaggerItem>
          </StaggerContainer>

          {/* Order Summary */}
          <FadeIn
            direction="left"
            delay={0.2}
            className="w-full shrink-0 lg:w-80"
          >
            <div className="sticky top-20 rounded-md border border-[#2a351f]/10 bg-white p-6">
              <h2 className="text-lg font-semibold text-[#2a351f]">
                Order Summary
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#4c566a]">
                    Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                  </span>
                  <span className="font-medium text-[#2a351f]">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#4c566a]">Shipping</span>
                  <span className="font-medium text-[#2a351f]">
                    {shipping === 0 ? "Free" : formatPrice(shipping)}
                  </span>
                </div>
                {showProgress && untilFree !== null && (
                  <div className="space-y-2">
                    <Progress value={progress * 100} className="h-2" />
                    <p className="text-xs text-[#4c566a]">
                      Add {formatPrice(untilFree)} more for free shipping
                    </p>
                  </div>
                )}
                {shipping > 0 &&
                  shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE && (
                    <p className="text-xs text-[#4c566a]">
                      Flat rate shipping on all orders
                    </p>
                  )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold text-[#2a351f]">
                    Estimated Total
                  </span>
                  <span className="text-lg font-bold text-[#215935]">
                    {formatPrice(estimatedTotal)}
                  </span>
                </div>
              </div>
              <Button
                className="mt-6 w-full bg-[#215935] text-white hover:bg-[#1a4729]"
                size="lg"
                asChild
              >
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
