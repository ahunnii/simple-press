import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { NoiseCheckoutForm } from "./noise-checkout-form";

/* 3-step stepper matching design — step 1 (Information) is always active here
   since the noise checkout form handles information + shipping in one screen  */
const STEPS = ["Information", "Shipping", "Payment"] as const;

export async function NoiseCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected) {
    return (
      <PageTransition>
        <section
          className="flex min-h-[50vh] flex-1 items-center justify-center p-7 text-center"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <div className="max-w-md flex flex-col gap-4">
            <p
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Checkout unavailable
            </p>
            <h1
              className="font-serif italic leading-none"
              style={{ fontSize: "2.5rem", letterSpacing: "-0.02em" }}
            >
              Payment not set up.
            </h1>
            <p
              className="font-sans text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              This store hasn&apos;t configured payment processing yet. Please
              contact the store owner.
            </p>
          </div>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* ── Centered header: "Checkout" overline + "Almost yours." h1 ── */}
      <section
        className="border-b border-foreground/15 px-6 pt-12 pb-10 text-center"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1240px" }}>
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase mb-3"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Checkout
          </p>
          <h1
            className="font-serif italic leading-none tracking-tight"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            Almost yours.
          </h1>

          {/* ── 3-step stepper ── */}
          <div className="flex items-center justify-center gap-8 mt-10">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const active = i === 0; // Information is the active step
              const done = false;     // Nothing is done yet on arrival
              return (
                <div key={label} className="flex items-center gap-2.5">
                  <span
                    className="flex-shrink-0 flex items-center justify-center rounded-full font-mono text-[10px] font-medium"
                    style={{
                      width: "24px",
                      height: "24px",
                      background: done || active ? "var(--vn-ink)" : "transparent",
                      color: done || active ? "#fff" : "var(--vn-steel-mist)",
                      border: `1px solid ${done || active ? "var(--vn-ink)" : "var(--vn-rule)"}`,
                    }}
                  >
                    {done ? "✓" : n}
                  </span>
                  <span
                    className="font-mono text-[10px] tracking-[0.18em] uppercase"
                    style={{
                      color: active ? "var(--vn-ink)" : "var(--vn-steel-mist)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </section>

      {/* ── Checkout form (handles address + shipping → redirects to Stripe) ── */}
      <div
        className="px-7 py-12"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn delay={0.1}>
          <NoiseCheckoutForm business={business} />
        </FadeIn>
      </div>
    </PageTransition>
  );
}
