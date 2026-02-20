import type { DefaultCartPageTemplateProps } from "../types";

import { ModernCartContent } from "./modern-cart-content";
import { ModernFooter } from "./modern-footer";
import { ModernHeader } from "./modern-header";

export default function ModernCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  return (
    <div>
      <div className="bg-background">
        <div className="border-border border-b">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <h1 className="text-foreground font-serif text-4xl md:text-5xl">
              Your Cart
            </h1>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <ModernCartContent />
        </div>
      </div>
    </div>
  );
}
