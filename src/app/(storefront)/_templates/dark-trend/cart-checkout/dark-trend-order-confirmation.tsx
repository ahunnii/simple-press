"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package } from "lucide-react";

import type { DarkTrendTextRow } from "./text-list";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { Button } from "~/components/ui/button";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

import { DARK_TREND_CONFIRMATION_STEPS_KEY } from "./order-fields";

type Props = {
  business: {
    id: string;
    name: string;
    siteContent: {
      primaryColor: string | null;
    } | null;
  };
  /** Resolved copy from `checkout.confirmation`, resolved server-side. */
  heading: string;
  nextHeading: string;
  continueLabel: string;
  /** Resolved `dark-trend.checkout.confirmation-next-steps` rows. */
  steps: DarkTrendTextRow[];
};

export function DarkTrendOrderConfirmation({
  business,
  heading,
  nextHeading,
  continueLabel,
  steps,
}: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<{
    customer_email: string;
    amount_total: number;
    currency: string;
    payment_status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // M-4: ref to focus the h1 once content is loaded
  const headingRef = useRef<HTMLHeadingElement>(null);

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

  // M-4: focus the heading once loading is complete and sessionId is present
  useEffect(() => {
    if (!loading && sessionId) {
      headingRef.current?.focus();
    }
  }, [loading, sessionId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        {/* M-4: loading state announced via role="status" */}
        <p role="status" className="text-white/70">
          Loading order details...
        </p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-white/70">No order found</p>
        <Button
          asChild
          className="bg-violet-600 text-white hover:bg-violet-700"
        >
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      {...sectionGroupAttr("checkout", "confirmation")}
      className="mx-auto max-w-3xl"
    >
      {/* Fire purchase analytics event once — idempotent via sessionStorage */}
      {orderDetails && (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      )}
      {/* Success Header */}
      <div className="mb-12 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
          {/* N-1: decorative icon */}
          <CheckCircle
            aria-hidden="true"
            className="h-12 w-12 text-green-400"
          />
        </div>
        {/* M-4: tabIndex={-1} + ref so focus lands here after redirect */}
        <h1
          ref={headingRef}
          tabIndex={-1}
          {...fieldAttr("dark-trend.checkout.confirmation-heading")}
          className="mb-4 text-4xl font-bold text-white lg:text-5xl"
        >
          {heading}
        </h1>
        <p className="text-lg text-white/70">
          Thank you for your purchase from {business.name}
        </p>
      </div>

      {/* Order Details Card */}
      <div className="mb-8 rounded-sm bg-zinc-900/30 p-8">
        <div className="mb-6 flex items-start gap-4">
          {/* N-1: decorative icon */}
          <Package
            aria-hidden="true"
            className="h-6 w-6 shrink-0 text-purple-400"
          />
          <div className="flex-1">
            <h2
              {...fieldAttr("dark-trend.checkout.confirmation-next-heading")}
              className="mb-3 text-xl font-semibold text-white"
            >
              {nextHeading}
            </h2>
            <ul className="space-y-2 text-white/70">
              {steps.map((step) => (
                <li
                  key={step.index}
                  {...listItemAttr(DARK_TREND_CONFIRMATION_STEPS_KEY, step.index)}
                  className="flex items-start gap-2"
                >
                  <span className="text-purple-400">•</span>
                  <span>{step.text}</span>
                </li>
              ))}
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
        {continueLabel ? (
          <Button
            asChild
            className="flex-1 border border-white/60 bg-transparent font-medium text-white hover:bg-white/10"
          >
            <Link href="/shop">
              <span
                {...fieldAttr(
                  "dark-trend.checkout.confirmation-continue-button",
                )}
              >
                {continueLabel}
              </span>
            </Link>
          </Button>
        ) : null}
        {/* S-11: violet-600 */}
        <Button
          asChild
          className="flex-1 bg-violet-600 font-medium text-white hover:bg-violet-700"
        >
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
