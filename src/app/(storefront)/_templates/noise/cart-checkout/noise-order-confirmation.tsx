"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

type Props = {
  business: {
    id: string;
    name: string;
    siteContent: { primaryColor: string | null } | null;
  };
};

export function NoiseOrderConfirmation({ business }: Props) {
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
    clearCart();
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/api/stripe/session?session_id=${sessionId}`);
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
        <p className="font-sans text-sm text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-sans text-sm text-muted-foreground mb-4">No order found</p>
        <Button asChild className="rounded-none font-sans text-[10px] tracking-[0.25em] uppercase">
          <Link href="/shop">Shop the Collection</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Success header */}
      <div className="mb-14 text-center">
        <div className="mb-6 inline-flex size-16 items-center justify-center border border-border">
          <CheckCircle2 className="size-7 text-foreground" />
        </div>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Order Confirmed
        </h1>
        <p className="mt-3 font-sans text-sm text-muted-foreground">
          Thank you for your purchase from {business.name}
        </p>
      </div>

      {/* Details */}
      <div className="mb-8 border border-border p-8">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center border border-border">
            <Package className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="mb-4 font-sans text-[10px] tracking-[0.25em] uppercase text-foreground">
              What Happens Next
            </h2>
            <ul className="space-y-2 font-sans text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-foreground">—</span>
                <span>You&apos;ll receive an email confirmation shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground">—</span>
                <span>We&apos;ll notify you when your order ships</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground">—</span>
                <span>Track your order status via email</span>
              </li>
            </ul>
          </div>
        </div>

        {orderDetails?.customer_email && (
          <div className="mt-6 border-t border-border pt-6">
            <p className="font-sans text-xs text-muted-foreground">
              Confirmation sent to:{" "}
              <span className="font-medium text-foreground">{orderDetails.customer_email}</span>
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          variant="outline"
          className="flex-1 rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
        >
          <Link href="/shop">Continue Shopping</Link>
        </Button>
        <Button
          asChild
          className="flex-1 rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
        >
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
