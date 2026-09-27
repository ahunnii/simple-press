"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package } from "lucide-react";

import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { Button } from "~/components/ui/button";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

import {
  CHECKOUT_CONFIRMATION_CONTINUE_BUTTON_DEFAULT,
  CHECKOUT_CONFIRMATION_HEADING_DEFAULT,
  CHECKOUT_CONFIRMATION_NEXT_HEADING_DEFAULT,
  CHECKOUT_CONFIRMATION_STEPS_DEFAULTS,
  CHECKOUT_CONFIRMATION_STEPS_KEY,
  CHECKOUT_CONFIRMATION_THANKS_PREFIX_DEFAULT,
} from "./order-fields";

type Business = {
  id: string;
  name: string;
  siteContent: {
    primaryColor: string | null;
  } | null;
};

/** One rendered row of the next-steps list, keeping its saved-list position. */
export type OrderConfirmationStep = { text: string; index: number };

const DEFAULT_STEPS: OrderConfirmationStep[] =
  CHECKOUT_CONFIRMATION_STEPS_DEFAULTS.map((text, index) => ({ text, index }));

/**
 * `heading`/`thanksPrefix`/`nextHeading`/`steps`/`continueLabel` are resolved
 * server-side in `DefaultOrderSuccessPage` from `checkout.confirmation`
 * fields. Every one is optional with the original hardcoded copy as its
 * fallback — `ModernOrderSuccessPage` and `PollenOrderSuccessPage` import
 * this component directly and don't pass any of them, so those templates
 * must keep rendering byte-identical output.
 */
type OrderConfirmationProps = {
  business: Business;
  heading?: string;
  thanksPrefix?: string;
  nextHeading?: string;
  steps?: OrderConfirmationStep[];
  continueLabel?: string;
};

export function DefaultOrderConfirmation({
  business,
  heading = CHECKOUT_CONFIRMATION_HEADING_DEFAULT,
  thanksPrefix = CHECKOUT_CONFIRMATION_THANKS_PREFIX_DEFAULT,
  nextHeading = CHECKOUT_CONFIRMATION_NEXT_HEADING_DEFAULT,
  steps = DEFAULT_STEPS,
  continueLabel = CHECKOUT_CONFIRMATION_CONTINUE_BUTTON_DEFAULT,
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
  const primaryColor = business.siteContent?.primaryColor ?? "#2563eb";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) {
    return (
      <div
        className="mx-auto max-w-2xl text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-[#6b6b6b]">Loading order details...</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-[#6b6b6b]">No order found</p>
        <Button asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      {...sectionGroupAttr("checkout", "confirmation")}
      className="mx-auto max-w-2xl"
    >
      {/* Fire purchase analytics event once — idempotent via sessionStorage */}
      {orderDetails && (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      )}
      <div className="mb-8 text-center">
        <div
          className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <CheckCircle
            className="h-10 w-10"
            style={{ color: primaryColor }}
            aria-hidden="true"
          />
        </div>
        <h1
          {...fieldAttr("default.checkout.confirmation-heading")}
          className="mb-2 text-3xl font-bold text-[#0a0a0a]"
        >
          {heading}
        </h1>
        <p className="text-lg text-[#6b6b6b]">
          <span {...fieldAttr("default.checkout.confirmation-thanks-prefix")}>
            {thanksPrefix}
          </span>{" "}
          {business.name}
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-[#f6f6f6] p-6">
        <div className="mb-4 flex items-start gap-4">
          <Package
            className="h-6 w-6 shrink-0 text-[#6b6b6b]"
            aria-hidden="true"
          />
          <div>
            <h2
              {...fieldAttr("default.checkout.confirmation-next-heading")}
              className="mb-1 font-semibold text-[#0a0a0a]"
            >
              {nextHeading}
            </h2>
            <ul className="space-y-1 text-sm text-[#6b6b6b]">
              {steps.map((step) => (
                <li
                  key={step.index}
                  {...listItemAttr(CHECKOUT_CONFIRMATION_STEPS_KEY, step.index)}
                >
                  • {step.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {orderDetails?.customer_email && (
          <div className="mt-4 border-t pt-4 text-sm text-[#6b6b6b]">
            <p>
              Confirmation sent to:{" "}
              <strong>{orderDetails.customer_email}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {continueLabel ? (
          <Button asChild variant="outline" className="flex-1">
            <Link href="/shop">
              <span
                {...fieldAttr("default.checkout.confirmation-continue-button")}
              >
                {continueLabel}
              </span>
            </Link>
          </Button>
        ) : null}
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
