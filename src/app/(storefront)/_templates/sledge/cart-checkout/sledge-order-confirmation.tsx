"use client";

import { useEffect, useRef, useState } from "react";
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
  // M-11: ref for focusing the confirmation heading when order loads
  const h1Ref = useRef<HTMLHeadingElement>(null);

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

  // M-11: move focus to the confirmation h1 once order details are ready
  useEffect(() => {
    if (!loading && sessionId && h1Ref.current) {
      h1Ref.current.focus();
    }
  }, [loading, sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-white">
        {/* M-11: live region so AT announces loading state */}
        <p
          role="status"
          className="sl-eyebrow font-sans text-sm tracking-[0.12em] uppercase"
        >
          Confirming your order…
        </p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 bg-white px-7 text-center">
        {/* N-5: only heading in this state → h1; C-3: large heading → AA accent token */}
        <h1 className="sl-tab-heading uppercase text-[var(--sl-coral-aa)] tracking-[0.04em] leading-none">
          No order found
        </h1>
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
          <div className="mx-auto mb-6 flex size-[72px] items-center justify-center rounded-full bg-[var(--sl-cream)] text-[var(--sl-coral)]">
            <CheckCircle2 className="size-8" aria-hidden />
          </div>

          <p className="sl-eyebrow mb-3 font-sans text-xs tracking-[0.18em] uppercase">
            Thank you · {business.name}
          </p>
          {/* M-11: tabIndex={-1} + ref so we can focus on load */}
          <h1
            ref={h1Ref}
            tabIndex={-1}
            className="sl-page-title-checkout font-heading uppercase text-[var(--sl-orange)] outline-none"
          >
            Order Placed!
          </h1>
          <p className="sl-eyebrow mx-auto mt-5 max-w-lg font-sans text-sm leading-relaxed md:text-base">
            Your order is confirmed and queued for preparation. We&apos;ll have
            everything packed and on its way soon.
          </p>

          {orderDetails?.amount_total ? (
            <div className="sl-card-panel mx-auto mt-8 inline-flex items-baseline gap-4 rounded-sm px-6 py-4">
              <span className="font-sans text-xs tracking-[0.16em] text-[var(--sl-ink-soft)] uppercase">
                Order total
              </span>
              <span className="font-sans text-2xl tracking-[0.02em] text-[var(--sl-ink)]">
                {formatPrice(orderDetails.amount_total)}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="bg-[var(--sl-cream)] px-7 py-12">
        <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
          {orderDetails?.customer_email && (
            <div className="sl-card-panel sl-card-shadow rounded-sm p-6">
              {/* M-3: coral on white at 10px → coral-aa */}
              <h2 className="mb-3 font-sans text-[10px] tracking-[0.18em] text-[var(--sl-coral-aa)] uppercase">
                Confirmation sent to
              </h2>
              <p className="font-sans text-sm text-[var(--sl-ink)]">
                {orderDetails.customer_email}
              </p>
            </div>
          )}

          <div className="sl-card-panel sl-card-shadow rounded-sm p-6 md:col-span-2">
            {/* M-3: coral on white at 10px → coral-aa */}
            <h2 className="mb-5 font-sans text-[10px] tracking-[0.18em] text-[var(--sl-coral-aa)] uppercase">
              What happens next
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {NEXT_STEPS.map((step) => (
                <div key={step.icon} className="flex items-start gap-3">
                  {/* N-1: decorative glyph */}
                  <span
                    aria-hidden="true"
                    className="flex size-6 flex-shrink-0 items-center justify-center rounded-sm bg-[var(--sl-cream)] font-sans text-xs text-[var(--sl-coral)]"
                  >
                    {step.icon}
                  </span>
                  <p className="font-sans text-sm leading-relaxed text-[var(--sl-ink-soft)]">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--sl-border)] bg-white px-7 py-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/shop" className="sl-btn flex-1 justify-center text-xs sm:flex-none">
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="flex flex-1 items-center justify-center rounded-sm border border-[var(--sl-ink)] px-5 py-2.5 font-sans text-xs tracking-[0.16em] text-[var(--sl-ink)] uppercase transition-opacity hover:opacity-70 sm:flex-none"
          >
            View My Orders →
          </Link>
          <Link
            href="/"
            className="sl-account-tab-inactive flex flex-1 items-center justify-center rounded-sm px-5 py-2.5 font-sans text-xs tracking-[0.16em] uppercase transition-opacity hover:opacity-70 sm:flex-none"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </>
  );
}
