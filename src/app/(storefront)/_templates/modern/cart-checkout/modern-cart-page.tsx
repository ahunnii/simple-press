import type { DefaultCartPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { ModernCartContents } from "./modern-cart-contents";

export default function ModernCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "modern.global.cart-heading",
    "modern.global.cart-empty-heading",
    "modern.global.cart-empty-text",
    "modern.global.cart-empty-button",
  ]);

  return (
    <div>
      <div className="bg-background" {...sectionGroupAttr("global", "cart")}>
        <div className="border-border border-b">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <h1
              className="text-foreground font-serif text-4xl md:text-5xl"
              {...fieldAttr("modern.global.cart-heading")}
            >
              {f["modern.global.cart-heading"]}
            </h1>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <ModernCartContents
            business={business}
            emptyHeading={f["modern.global.cart-empty-heading"] ?? ""}
            emptyText={f["modern.global.cart-empty-text"] ?? ""}
            emptyButtonText={f["modern.global.cart-empty-button"] ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
