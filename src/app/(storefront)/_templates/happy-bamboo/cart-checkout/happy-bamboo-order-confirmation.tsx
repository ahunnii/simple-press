"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package, PackageSearch } from "lucide-react";

import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

/** `session.metadata.deliveryMethod` as returned by `/api/stripe/session`. */
type DeliveryMethod = "ship" | "pickup" | null;

type Props = {
  business: {
    id: string;
    name: string;
    siteContent: {
      primaryColor: string | null;
    } | null;
    pickupLocation?: string | null;
    pickupInstructions?: string | null;
  };
};

/**
 * "What happens next?" bullets, keyed by the Stripe session's delivery method
 * (`session.metadata.deliveryMethod`, "ship" | "pickup" | unset). Mirrors
 * bamboo's order confirmation wording (PF14 / B9.3): pickup orders are never
 * told "we'll notify you when your order ships".
 */
function nextStepsBullets(deliveryMethod: DeliveryMethod): string[] {
  if (deliveryMethod === "pickup") {
    return [
      "You'll receive an email confirmation shortly",
      "We'll let you know when your order is ready for pickup",
    ];
  }
  if (deliveryMethod === "ship") {
    return [
      "You'll receive an email confirmation shortly",
      "We'll notify you when your order ships",
      "Track your order status via email",
    ];
  }
  return [
    "You'll receive an email confirmation shortly",
    "We'll email you with updates about your order",
  ];
}

type AccountCta = { href: string; label: string };

/**
 * B9.4 / PF15, inline (P-ORDER-CTA stays unbuilt for this run): signed in +
 * `orders` on → "View my orders"; signed out + `customerAccounts` on →
 * "Create an account"; otherwise nothing. Unseeded `useHydratedSession()`
 * renders nothing until the client session settles, so this never flashes
 * the wrong state.
 */
function useOrderAccountCta(): AccountCta | null {
  const { data: session, isPending } = useHydratedSession();
  const { isEnabled } = useStorefrontFlags();

  if (isPending) {
    return null;
  }

  if (session?.user) {
    return isEnabled("orders")
      ? { href: "/account/orders", label: "View my orders" }
      : null;
  }

  return isEnabled("customerAccounts")
    ? { href: "/auth/sign-up", label: "Create an account" }
    : null;
}

export function HappyBambooOrderConfirmation({ business }: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<{
    customer_email: string;
    amount_total: number;
    currency: string;
    payment_status: string;
    delivery_method: DeliveryMethod;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const accountCta = useOrderAccountCta();

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    // Clear cart on successful order
    clearCart();

    // Fetch order details
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(
          `/api/stripe/session?session_id=${sessionId}`,
        );
        if (response.ok) {
          const data = (await response.json()) as {
            customer_email: string;
            amount_total: number;
            currency: string;
            payment_status: string;
            delivery_method: DeliveryMethod;
          };

          setOrderDetails(data);
        }
      } catch (error) {
        console.error("Failed to fetch order details:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchOrderDetails();
  }, [sessionId, clearCart]);

  if (loading) {
    return (
      <div
        className="mx-auto max-w-2xl text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <div className="bg-primary/10 mb-6 inline-flex size-16 items-center justify-center rounded-full">
            <PackageSearch className="text-primary size-8" aria-hidden="true" />
          </div>
          <h1 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            We couldn&apos;t find that order
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            This page needs an order to show. If you just checked out, check
            your email for a receipt.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link href="/shop">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const bullets = nextStepsBullets(orderDetails?.delivery_method ?? null);
  const showPickupLocation =
    orderDetails?.delivery_method === "pickup" &&
    !!business.pickupLocation?.trim();

  return (
    <div className="mx-auto max-w-3xl">
      {/* Fire purchase analytics event once — idempotent via sessionStorage */}
      {orderDetails && (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      )}
      {/* Success Header */}
      <div className="mb-12 text-center">
        <div className="bg-primary/10 mb-6 inline-flex size-16 items-center justify-center rounded-full">
          <CheckCircle2 className="text-primary size-8" aria-hidden="true" />
        </div>
        <h1 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
          Order Confirmed!
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Thank you for your purchase from {business.name}
        </p>
      </div>

      {/* Order Details Card */}
      <Card className="border-primary/20 bg-primary/5 mb-8">
        <CardContent className="p-8">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
              <Package className="text-primary size-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h2 className="text-foreground mb-3 text-xl font-semibold">
                What happens next?
              </h2>
              <ul className="text-muted-foreground space-y-2">
                {bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span className="text-primary" aria-hidden="true">
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {showPickupLocation && (
                <div className="mt-4 text-sm">
                  <p className="text-foreground font-semibold">
                    Pickup location
                  </p>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {business.pickupLocation}
                  </p>
                  {business.pickupInstructions?.trim() && (
                    <p className="text-muted-foreground mt-1 whitespace-pre-line">
                      {business.pickupInstructions}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {orderDetails?.customer_email && (
            <div className="border-border mt-6 border-t pt-6 text-sm">
              <p className="text-muted-foreground">
                Confirmation sent to:{" "}
                <span className="text-foreground font-semibold">
                  {orderDetails.customer_email}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/">Back to Home</Link>
        </Button>
        {accountCta && (
          <Button asChild variant="outline" className="flex-1">
            <Link href={accountCta.href}>{accountCta.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
