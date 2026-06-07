import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { NoiseCheckoutForm } from "./noise-checkout-form";

export async function SledgeCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  return (
    <PageTransition>
      <section className="bg-white px-7 pt-16 pb-10 md:pt-20 md:pb-12">
        <FadeIn className="sl-container">
          <h1 className="sl-page-title-checkout uppercase">Checkout</h1>
          <p className="sl-eyebrow mt-4 max-w-[52ch] font-sans text-sm leading-relaxed md:text-base">
            Complete your details below — you&apos;ll confirm payment securely
            with Stripe.
          </p>
        </FadeIn>
      </section>

      <div className="bg-white px-7 pb-16 md:pb-20">
        <FadeIn delay={0.1} className="sl-container">
          <NoiseCheckoutForm business={business} />
        </FadeIn>
      </div>
    </PageTransition>
  );
}
