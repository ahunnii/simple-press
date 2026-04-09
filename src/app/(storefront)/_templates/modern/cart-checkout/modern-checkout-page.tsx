import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { ModernCheckoutForm } from "./modern-checkout-form";

export function ModernCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  return (
    <div>
      <div className="bg-background">
        <div className="border-border border-b">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <h1 className="text-foreground font-serif text-4xl md:text-5xl">
              Checkout
            </h1>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <ModernCheckoutForm business={business} />
        </div>
      </div>
    </div>
  );
}
