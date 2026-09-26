"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

/** `session.metadata.deliveryMethod` as returned by `/api/stripe/session`. */
type DeliveryMethod = "ship" | "pickup" | null;

type OrderDetails = {
  customer_email: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  delivery_method: DeliveryMethod;
};

/**
 * Neutral, structural copy that holds for every store — no shipping-speed,
 * packing, or tracking promises (those belong in the owner's
 * `noise.checkout.success-note`). Keyed by the Stripe session's delivery
 * method; unknown (older sessions, or no pickup offered) stays generic.
 */
function confirmationCopy(deliveryMethod: DeliveryMethod): {
  lead: string;
  steps: { icon: string; text: string }[];
} {
  const email = {
    icon: "✉",
    text: "You'll receive an email confirmation at the address provided.",
  };
  if (deliveryMethod === "pickup") {
    return {
      lead: "Your order is queued for preparation. We'll let you know when it's ready for pickup.",
      steps: [
        email,
        {
          icon: "↗",
          text: "We'll let you know when your order is ready for pickup.",
        },
      ],
    };
  }
  if (deliveryMethod === "ship") {
    return {
      lead: "Your order is queued for preparation. We'll email you when it ships.",
      steps: [
        email,
        { icon: "↗", text: "We'll email you when your order ships." },
      ],
    };
  }
  return {
    lead: "Your order is queued for preparation. We'll email you with updates.",
    steps: [
      email,
      { icon: "↗", text: "We'll email you with updates about your order." },
    ],
  };
}

type Props = {
  business: {
    id: string;
    name: string;
    siteContent: { primaryColor: string | null } | null;
    pickupLocation?: string | null;
    pickupInstructions?: string | null;
  };
  /** Owner-authored note (`noise.checkout.success-note`); blank hides it. */
  note?: string;
};

export function NoiseOrderConfirmation({ business, note = "" }: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const confirmationH1Ref = useRef<HTMLHeadingElement>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    clearCart();
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(
          `/api/stripe/session?session_id=${sessionId}`,
        );
        if (response.ok) {
          const data = (await response.json()) as OrderDetails;
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

  // Focus the h1 once the confirmed state renders
  useEffect(() => {
    if (!loading && sessionId) {
      const id = setTimeout(() => confirmationH1Ref.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [loading, sessionId]);

  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-[40vh] items-center justify-center"
        style={{ background: "var(--vn-paper)" }}
      >
        <p
          className="font-mono text-[10px] tracking-[0.22em] uppercase"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Confirming your transmission…
        </p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-6 px-7 text-center"
        style={{ background: "var(--vn-paper)" }}
      >
        <p
          className="font-serif text-2xl italic"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          No order found.
        </p>
        <Link href="/shop" className="vn-stamp vn-stamp-solid text-[10px]">
          Shop the Collection →
        </Link>
      </div>
    );
  }

  const deliveryMethod = orderDetails?.delivery_method ?? null;
  const { lead, steps } = confirmationCopy(deliveryMethod);
  const pickupLocation =
    deliveryMethod === "pickup" ? (business.pickupLocation?.trim() ?? "") : "";
  const pickupInstructions = pickupLocation
    ? (business.pickupInstructions?.trim() ?? "")
    : "";
  const trimmedNote = note.trim();

  return (
    <div {...sectionGroupAttr("checkout", "success")}>
      {/* Fire purchase analytics event once — idempotent via sessionStorage */}
      {orderDetails && (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      )}
      {/* Success hero — ink background */}
      <section
        className="border-foreground grid border-b-2 md:grid-cols-2"
        style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
      >
        {/* Left — headline */}
        <div
          className="border-foreground flex flex-col justify-between gap-8 border-b px-7 py-14 md:border-r md:border-b-0"
          style={{ borderColor: "#2a2c30" }}
        >
          <div className="flex flex-col gap-4">
            <p
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Transmission confirmed · {business.name}
            </p>
            <h1
              ref={confirmationH1Ref}
              tabIndex={-1}
              className="font-serif leading-[0.95] tracking-tight italic"
              style={{
                fontSize: "clamp(3rem, 6vw, 5.5rem)",
                letterSpacing: "-0.025em",
              }}
            >
              Order placed.
            </h1>
            <p
              className="max-w-[40ch] font-sans text-[15px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              {lead}
            </p>
          </div>

          {/* Order amount */}
          {orderDetails?.amount_total && (
            <div
              className="flex items-baseline justify-between border-t pt-6"
              style={{ borderColor: "#2a2c30" }}
            >
              <span
                className="font-mono text-[10.5px] tracking-[0.22em] uppercase"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Order total
              </span>
              <span
                className="font-serif leading-none italic"
                style={{ fontSize: "32px", letterSpacing: "-0.02em" }}
              >
                {formatPrice(orderDetails.amount_total)}
              </span>
            </div>
          )}
        </div>

        {/* Right — confirmation details + next steps */}
        <div className="flex flex-col gap-8 px-7 py-14">
          {orderDetails?.customer_email && (
            <div>
              <h2
                className="mb-3 font-mono text-[9px] tracking-[0.22em] uppercase"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Confirmation sent to
              </h2>
              <p
                className="font-mono text-[12px] tracking-[0.08em]"
                style={{ color: "var(--vn-bone)" }}
              >
                {orderDetails.customer_email}
              </p>
            </div>
          )}

          <div>
            <h2
              className="mb-5 font-mono text-[9px] tracking-[0.22em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              What happens next
            </h2>
            <div className="flex flex-col gap-3.5">
              {steps.map((step) => (
                <div key={step.icon} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex flex-shrink-0 items-center justify-center border font-serif italic"
                    style={{
                      width: "24px",
                      height: "24px",
                      borderColor: "#2a2c30",
                      fontSize: "13px",
                      color: "var(--vn-bone)",
                    }}
                  >
                    {step.icon}
                  </span>
                  <p
                    className="font-mono text-[10px] leading-relaxed tracking-[0.14em] uppercase"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {step.text}
                  </p>
                </div>
              ))}
            </div>

            {pickupLocation ? (
              <div className="mt-6">
                <h3
                  className="mb-2 font-mono text-[9px] tracking-[0.22em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  Pickup location
                </h3>
                <p
                  className="font-sans text-[14px] leading-relaxed whitespace-pre-line"
                  style={{ color: "var(--vn-bone)" }}
                >
                  {pickupLocation}
                </p>
                {pickupInstructions ? (
                  <p
                    className="mt-1 font-sans text-[13px] leading-relaxed whitespace-pre-line"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {pickupInstructions}
                  </p>
                ) : null}
              </div>
            ) : null}

            {trimmedNote ? (
              <p
                className="mt-6 font-sans text-[14px] leading-relaxed whitespace-pre-line"
                style={{ color: "rgba(255,255,255,0.75)" }}
                {...fieldAttr("noise.checkout.success-note")}
              >
                {trimmedNote}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* CTA row */}
      <div
        className="border-foreground/15 flex flex-col gap-3 border-b px-7 py-8 sm:flex-row"
        style={{ background: "var(--vn-bone)" }}
      >
        <Link
          href="/shop"
          className="vn-stamp hover:bg-foreground hover:text-background flex-1 justify-center text-[10.5px] transition-all"
          style={{ padding: "12px 20px" }}
        >
          Continue Shopping
        </Link>
        <Link
          href="/account/orders"
          className="vn-stamp vn-stamp-solid flex-1 justify-center text-[10.5px] transition-all hover:opacity-80"
          style={{ padding: "12px 20px" }}
        >
          View My Orders →
        </Link>
        <Link
          href="/"
          className="vn-stamp hover:bg-foreground hover:text-background flex-1 justify-center text-[10.5px] transition-all"
          style={{ padding: "12px 20px" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
