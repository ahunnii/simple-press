"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

type Props = {
  business: {
    id: string;
    name: string;
    siteContent: {
      primaryColor: string | null;
    } | null;
  };
};

// Order-details fetch is best-effort only — it must never block the
// "Order Confirmed!" heading. If it hangs or fails, the customer still
// paid and still needs to see confirmation, so we cap it with a timeout
// and treat any failure as "no extra details available" rather than an
// error state.
const DETAILS_FETCH_TIMEOUT_MS = 10_000;

export function BambooOrderConfirmation({ business }: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<{
    customer_email: string;
    amount_total: number;
    currency: string;
    payment_status: string;
  } | null>(null);
  // Gates only the order-details card (email/amount), never the
  // confirmation heading itself.
  const [detailsLoading, setDetailsLoading] = useState(true);
  const confirmedHeadingRef = useRef<HTMLHeadingElement>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setDetailsLoading(false);
      return;
    }

    // Clear cart on successful order
    clearCart();

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      DETAILS_FETCH_TIMEOUT_MS,
    );

    // Fetch order details (best-effort; never blocks the confirmation UI)
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(
          `/api/stripe/session?session_id=${sessionId}`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const data = (await response.json()) as {
            customer_email: string;
            amount_total: number;
            currency: string;
            payment_status: string;
          };

          setOrderDetails(data);
        }
      } catch (error) {
        console.error("Failed to fetch order details:", error);
      } finally {
        clearTimeout(timeoutId);
        setDetailsLoading(false);
      }
    };

    void fetchOrderDetails();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [sessionId, clearCart]);

  // M-4: Move focus to the "Order Confirmed!" heading as soon as it renders
  // (as soon as we know we have a valid session_id) — do not wait on the
  // order-details fetch, which is best-effort and may never resolve.
  useEffect(() => {
    if (sessionId) {
      confirmedHeadingRef.current?.focus();
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground mb-4">No order found</p>
        <Button asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

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
        <div
          className="bg-primary/10 mb-6 inline-flex size-16 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <CheckCircle2 className="text-primary size-8" />
        </div>
        <h1
          ref={confirmedHeadingRef}
          tabIndex={-1}
          className="font-heading text-foreground text-3xl font-bold tracking-tight outline-none md:text-4xl lg:text-5xl"
        >
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
            <div
              className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full"
              aria-hidden="true"
            >
              <Package className="text-primary size-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-foreground mb-3 text-xl font-semibold">
                What happens next?
              </h2>
              <ul className="text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>You&apos;ll receive an email confirmation shortly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>We&apos;ll notify you when your order ships</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Track your order status via email</span>
                </li>
              </ul>
            </div>
          </div>

          {detailsLoading ? (
            <div
              className="border-border mt-6 border-t pt-6 text-sm"
              role="status"
            >
              <p className="text-muted-foreground animate-pulse">
                Loading confirmation details…
              </p>
            </div>
          ) : (
            orderDetails?.customer_email && (
              <div className="border-border mt-6 border-t pt-6 text-sm">
                <p className="text-muted-foreground">
                  Confirmation sent to:{" "}
                  <span className="text-foreground font-semibold">
                    {orderDetails.customer_email}
                  </span>
                </p>
              </div>
            )
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
      </div>
    </div>
  );
}
