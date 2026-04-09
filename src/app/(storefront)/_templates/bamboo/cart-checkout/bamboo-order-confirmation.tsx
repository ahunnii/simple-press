"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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

export function BambooOrderConfirmation({ business }: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<{
    customer_email: string;
    amount_total: number;
    currency: string;
    payment_status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

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
      {/* Success Header */}
      <div className="mb-12 text-center">
        <div className="bg-primary/10 mb-6 inline-flex size-16 items-center justify-center rounded-full">
          <CheckCircle2 className="text-primary size-8" />
        </div>
        <h1 className="font-heading text-foreground text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
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
      </div>
    </div>
  );
}
