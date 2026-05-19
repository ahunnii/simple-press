import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { NoiseCheckoutForm } from "./noise-checkout-form";

const CHECKOUT_STEPS = [
  { n: "01", label: "The Bag", href: "/cart" },
  { n: "02", label: "Ship to", href: null },
  { n: "03", label: "Pay", href: null },
  { n: "04", label: "Confirm", href: null },
] as const;

export async function NoiseCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected) {
    return (
      <PageTransition>
        <section
          className="flex min-h-[50vh] flex-1 items-center justify-center p-7"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <div className="max-w-md text-center flex flex-col gap-4">
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
      {/* Editorial checkout header with step progression */}
      <section
        className="border-b-2 border-foreground"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn>
          <div className="flex items-stretch" style={{ minHeight: "100px" }}>
            {/* Left meta */}
            <div
              className="hidden md:flex flex-col justify-center gap-2 px-7 py-6 border-r border-foreground/20"
              style={{ minWidth: "180px" }}
            >
              <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground">
                Section / 05
              </span>
              <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground opacity-60">
                Secure checkout
              </span>
            </div>

            {/* Title */}
            <div className="flex-1 flex items-center px-7 py-6">
              <h1
                className="font-serif italic leading-none tracking-tight"
                style={{
                  fontSize: "clamp(2.2rem, 5vw, 4rem)",
                  letterSpacing: "-0.025em",
                }}
              >
                Ship to.
                <span
                  className="font-mono not-italic ml-4 align-middle"
                  style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)", color: "var(--vn-steel)", letterSpacing: "0.18em" }}
                >
                  Step 02 / 04
                </span>
              </h1>
            </div>

            {/* Step indicators */}
            <div className="hidden lg:flex items-center px-7 gap-0">
              {CHECKOUT_STEPS.map((step, i) => (
                <div key={step.n} className="flex items-center">
                  <div
                    className="flex items-center gap-2"
                    style={{ opacity: i === 1 ? 1 : 0.35 }}
                  >
                    <span
                      className="flex-shrink-0 flex items-center justify-center border font-mono text-[9px] tracking-[0.1em]"
                      style={{
                        width: "24px",
                        height: "24px",
                        background: i === 1 ? "var(--vn-ink)" : "transparent",
                        color: i === 1 ? "var(--vn-bone)" : "var(--vn-ink)",
                        borderColor: i === 1 ? "var(--vn-ink)" : "var(--vn-rule)",
                      }}
                    >
                      {step.n}
                    </span>
                    <span
                      className="font-mono text-[9.5px] tracking-[0.14em] uppercase whitespace-nowrap"
                      style={{ color: i === 1 ? "var(--vn-ink)" : "var(--vn-steel-mist)" }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < CHECKOUT_STEPS.length - 1 && (
                    <span
                      className="mx-3 font-mono text-[10px]"
                      style={{ color: "var(--vn-rule)" }}
                    >
                      /
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Form */}
      <div className="px-7 py-12" style={{ background: "var(--vn-paper)" }}>
        <FadeIn delay={0.1}>
          <NoiseCheckoutForm business={business} />
        </FadeIn>
      </div>
    </PageTransition>
  );
}
