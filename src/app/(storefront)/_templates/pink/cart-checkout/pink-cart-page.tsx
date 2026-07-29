import type { DefaultCartPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { PinkCartContents } from "./pink-cart-contents";

/**
 * Cart page — design.md → "Per-page section concepts → Cart". Single
 * section (`cart.main`, not hideable): heading, intro, then a server → client
 * handoff to `PinkCartContents`, which reads `useCart()` for line items and
 * renders the empty state or the two-column basket layout.
 */
export async function PinkCartPage({ business }: DefaultCartPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "pink.cart.heading",
    "pink.cart.intro",
    "pink.cart.summary-note",
    "pink.cart.checkout-label",
    "pink.cart.continue-shopping-label",
    "pink.cart.empty-heading",
    "pink.cart.empty-body",
    "pink.cart.empty-cta",
  ]);

  const heading = f["pink.cart.heading"] ?? "";
  const intro = f["pink.cart.intro"] ?? "";

  return (
    <div
      className="px-5 pt-16 pb-20 md:px-10 md:pt-20 md:pb-28"
      style={{ background: "var(--pink-paper)" }}
      {...sectionGroupAttr("cart", "main")}
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        <h1
          className="pink-display max-w-[16ch] text-[clamp(30px,3.6vw,48px)] leading-[1.05] tracking-[-0.03em]"
          {...fieldAttr("pink.cart.heading")}
        >
          {heading}
        </h1>
        {intro && (
          <p
            className="max-w-[52ch] text-[16px] leading-[1.7]"
            style={{ color: "var(--pink-muted)" }}
            {...fieldAttr("pink.cart.intro")}
          >
            {intro}
          </p>
        )}
      </div>

      <div className="mx-auto mt-12 max-w-[1400px]">
        <PinkCartContents
          heading={heading}
          summaryNote={f["pink.cart.summary-note"] ?? ""}
          checkoutLabel={f["pink.cart.checkout-label"] ?? ""}
          continueShoppingLabel={f["pink.cart.continue-shopping-label"] ?? ""}
          emptyHeading={f["pink.cart.empty-heading"] ?? ""}
          emptyBody={f["pink.cart.empty-body"] ?? ""}
          emptyCta={f["pink.cart.empty-cta"] ?? ""}
        />
      </div>
    </div>
  );
}
