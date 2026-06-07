"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { useCart } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";

const NEXT_STEPS = [
  { icon: "✉", text: "You'll receive an email confirmation at the address provided." },
  { icon: "✱", text: "Each piece is handcrafted with care before it ships." },
  { icon: "↗", text: "We'll notify you with a tracking number when your order ships." },
  { icon: "✓", text: "All sales are final — thank you for supporting the studio." },
] as const;

type Props = {
  business: {
    id: string;
    name: string;
    siteContent: { primaryColor: string | null } | null;
  };
};

export function SledgeOrderConfirmation({ business }: Props) {
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
      <div className="flex min-h-[40vh] items-center justify-center bg-white">
        <p
          className="font-sans text-sm tracking-[0.12em] uppercase"
          style={{ color: "var(--sl-ink-soft)" }}
        >
          Confirming your order…
        </p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 bg-white px-7 text-center">
        <p
          className="uppercase"
          style={{
            fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
            color: "var(--sl-coral)",
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          No order found
        </p>
        <Link href="/shop" className="sl-btn text-xs">
          Browse Shop →
        </Link>
      </div>
    );
  }

  return (
    <>
      <section className="bg-white px-7 pt-16 pb-10 md:pt-20 md:pb-14">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="mx-auto mb-6 flex items-center justify-center rounded-full"
            style={{
              width: "72px",
              height: "72px",
              background: "var(--sl-cream)",
              color: "var(--sl-coral)",
            }}
          >
            <CheckCircle2 className="size-8" aria-hidden />
          </div>

          <p
            className="mb-3 font-sans text-xs tracking-[0.18em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            Thank you · {business.name}
          </p>
          <h1
            className="font-heading uppercase"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              color: "var(--sl-orange)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            Order Placed!
          </h1>
          <p
            className="mx-auto mt-5 max-w-lg font-sans text-sm leading-relaxed md:text-base"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            Your order is confirmed and queued for preparation. We&apos;ll have
            everything packed and on its way soon.
          </p>

          {orderDetails?.amount_total ? (
            <div
              className="mx-auto mt-8 inline-flex items-baseline gap-4 rounded-sm px-6 py-4"
              style={{
                background: "var(--sl-cream)",
                border: "1px solid #e8e8e8",
              }}
            >
              <span
                className="font-sans text-xs tracking-[0.16em] uppercase"
                style={{ color: "var(--sl-ink-soft)" }}
              >
                Order total
              </span>
              <span
                className="font-sans text-2xl tracking-[0.02em]"
                style={{ color: "var(--sl-ink)" }}
              >
                {formatPrice(orderDetails.amount_total)}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section
        className="px-7 py-12"
        style={{ background: "var(--sl-cream)" }}
      >
        <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
          {orderDetails?.customer_email && (
            <div
              className="rounded-sm bg-white p-6"
              style={{
                border: "1px solid #e8e8e8",
                boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
              }}
            >
              <h2
                className="mb-3 font-sans text-[10px] tracking-[0.18em] uppercase"
                style={{ color: "var(--sl-coral)" }}
              >
                Confirmation sent to
              </h2>
              <p className="font-sans text-sm" style={{ color: "var(--sl-ink)" }}>
                {orderDetails.customer_email}
              </p>
            </div>
          )}

          <div
            className="rounded-sm bg-white p-6 md:col-span-2"
            style={{
              border: "1px solid #e8e8e8",
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
            }}
          >
            <h2
              className="mb-5 font-sans text-[10px] tracking-[0.18em] uppercase"
              style={{ color: "var(--sl-coral)" }}
            >
              What happens next
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {NEXT_STEPS.map((step) => (
                <div key={step.icon} className="flex items-start gap-3">
                  <span
                    className="flex flex-shrink-0 items-center justify-center rounded-sm font-sans text-xs"
                    style={{
                      width: "24px",
                      height: "24px",
                      background: "var(--sl-cream)",
                      color: "var(--sl-coral)",
                    }}
                  >
                    {step.icon}
                  </span>
                  <p
                    className="font-sans text-sm leading-relaxed"
                    style={{ color: "var(--sl-ink-soft)" }}
                  >
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-white px-7 py-10" style={{ borderColor: "#e8e8e8" }}>
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/shop" className="sl-btn flex-1 justify-center text-xs sm:flex-none">
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="flex flex-1 items-center justify-center rounded-sm px-5 py-2.5 font-sans text-xs tracking-[0.16em] uppercase transition-opacity hover:opacity-70 sm:flex-none"
            style={{
              border: "1px solid var(--sl-ink)",
              color: "var(--sl-ink)",
            }}
          >
            View My Orders →
          </Link>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center rounded-sm px-5 py-2.5 font-sans text-xs tracking-[0.16em] uppercase transition-opacity hover:opacity-70 sm:flex-none"
            style={{
              border: "1px solid #d8d8d8",
              color: "var(--sl-ink-soft)",
            }}
          >
            Back to Home
          </Link>
        </div>
      </section>
    </>
  );
}
