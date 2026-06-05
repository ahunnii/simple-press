import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { NoiseCheckoutForm } from "./noise-checkout-form";

export async function SledgeCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  return (
    <PageTransition>
      <section
        className="px-7 pt-16 pb-10 md:pt-20 md:pb-12"
        style={{ background: "#ffffff" }}
      >
        <FadeIn style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h1
            className="uppercase"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              color: "var(--sl-coral)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            Checkout
          </h1>
          <p
            className="mt-4 font-sans text-sm leading-relaxed md:text-base"
            style={{ color: "var(--sl-ink-soft)", maxWidth: "52ch" }}
          >
            Complete your details below — you&apos;ll confirm payment securely
            with Stripe.
          </p>
        </FadeIn>
      </section>

      <div className="px-7 pb-16 md:pb-20" style={{ background: "#ffffff" }}>
        <FadeIn delay={0.1} style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <NoiseCheckoutForm business={business} />
        </FadeIn>
      </div>
    </PageTransition>
  );
}
