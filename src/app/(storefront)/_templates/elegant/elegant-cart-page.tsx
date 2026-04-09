import type { DefaultCartPageTemplateProps } from "../types";

import { ElegantCartContent } from "./elegant-cart-content";

export function ElegantCartPage({ business: _ }: DefaultCartPageTemplateProps) {
  return (
    <div className="min-h-screen">
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="mb-2 text-sm tracking-widest text-muted-foreground uppercase">
            Review
          </p>
          <h1 className="font-serif text-4xl font-light tracking-wide text-foreground">
            Your Cart
          </h1>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <ElegantCartContent />
      </section>
    </div>
  );
}
