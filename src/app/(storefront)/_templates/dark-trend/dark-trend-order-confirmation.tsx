"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

type Business = {
  id: string;
  name: string;
  siteContent: {
    primaryColor: string | null;
  } | null;
};

type OrderConfirmationProps = {
  business: Business;
};

export function DarkTrendOrderConfirmation({
  business,
}: OrderConfirmationProps) {
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
        <p className="text-white/70">Loading order details...</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-white/70">No order found</p>
        <Button asChild className="bg-violet-500 text-white hover:bg-violet-600">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Success Header */}
      <div className="mb-12 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle className="h-12 w-12 text-green-400" />
        </div>
        <h1 className="mb-4 text-4xl font-bold text-white lg:text-5xl">
          Order Confirmed!
        </h1>
        <p className="text-lg text-white/70">
          Thank you for your purchase from {business.name}
        </p>
      </div>

      {/* Order Details Card */}
      <div className="mb-8 rounded-sm bg-zinc-900/30 p-8">
        <div className="mb-6 flex items-start gap-4">
          <Package className="h-6 w-6 shrink-0 text-purple-500" />
          <div className="flex-1">
            <h2 className="mb-3 text-xl font-semibold text-white">
              What happens next?
            </h2>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span>You&apos;ll receive an email confirmation shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span>We&apos;ll notify you when your order ships</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span>Track your order status via email</span>
              </li>
            </ul>
          </div>
        </div>

        {orderDetails?.customer_email && (
          <div className="mt-6 border-t border-white/10 pt-6 text-sm">
            <p className="text-white/70">
              Confirmation sent to:{" "}
              <span className="font-semibold text-white">
                {orderDetails.customer_email}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          asChild
          className="flex-1 border border-white/60 bg-transparent font-medium text-white hover:bg-white/10"
        >
          <Link href="/shop">Continue Shopping</Link>
        </Button>
        <Button
          asChild
          className="flex-1 bg-violet-500 font-medium text-white hover:bg-violet-600"
        >
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
