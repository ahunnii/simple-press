"use client";

import { CheckCircle, Package } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { useCart } from "~/lib/cart-context";

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

export function OrderConfirmation({ business }: OrderConfirmationProps) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get("session_id");
  const primaryColor = business.siteContent?.primaryColor || "#3b82f6";

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
          `/api/checkout/session?session_id=${sessionId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setOrderDetails(data);
        }
      } catch (error) {
        console.error("Failed to fetch order details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionId, clearCart]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-gray-600">Loading order details...</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-gray-600">No order found</p>
        <Button asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <div
          className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Order Confirmed!
        </h1>
        <p className="text-lg text-gray-600">
          Thank you for your purchase from {business.name}
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-gray-50 p-6">
        <div className="mb-4 flex items-start gap-4">
          <Package className="h-6 w-6 flex-shrink-0 text-gray-400" />
          <div>
            <h2 className="mb-1 font-semibold text-gray-900">
              What happens next?
            </h2>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• You'll receive an email confirmation shortly</li>
              <li>• We'll notify you when your order ships</li>
              <li>• Track your order status via email</li>
            </ul>
          </div>
        </div>

        {orderDetails?.customer_email && (
          <div className="mt-4 border-t pt-4 text-sm text-gray-600">
            <p>
              Confirmation sent to:{" "}
              <strong>{orderDetails.customer_email}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/products">Continue Shopping</Link>
        </Button>
        <Button
          asChild
          className="flex-1 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
