import type { DefaultCartPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { OliveBreadcrumb, OliveReveal, OliveSection } from "../shared";
import { OliveCartContents } from "./olive-cart-contents";

/**
 * Cart page — design.md → "Per-page section concepts → CartPage".
 *
 * One section (`cart.main`, not hideable). The title block is resolved and
 * rendered here; everything that needs the bag itself is handed to
 * `OliveCartContents`, a client component reading `useCart()`.
 */
export async function OliveCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.cart.heading",
    "olive.cart.intro",
    "olive.cart.summary-heading",
    "olive.cart.summary-note",
    "olive.cart.checkout-label",
    "olive.cart.continue-shopping",
    "olive.cart.empty-heading",
    "olive.cart.empty-body",
    "olive.cart.empty-cta",
  ]);

  const intro = f["olive.cart.intro"] ?? "";

  return (
    <OliveSection
      aria-labelledby="olive-cart-heading"
      {...sectionGroupAttr("cart", "main")}
    >
      <OliveBreadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Bag" }]}
        className="mb-6"
      />

      <OliveReveal className="flex flex-col gap-3">
        <h1
          id="olive-cart-heading"
          className="olive-h1"
          {...fieldAttr("olive.cart.heading")}
        >
          {f["olive.cart.heading"] ?? ""}
        </h1>
        {intro ? (
          <p
            className="max-w-[58ch] text-[0.9375rem] leading-relaxed"
            style={{ color: "var(--olive-ink-soft)" }}
            {...fieldAttr("olive.cart.intro")}
          >
            {intro}
          </p>
        ) : null}
      </OliveReveal>

      <OliveCartContents
        summaryHeading={f["olive.cart.summary-heading"] ?? ""}
        summaryHeadingFieldKey="olive.cart.summary-heading"
        summaryNote={f["olive.cart.summary-note"] ?? ""}
        summaryNoteFieldKey="olive.cart.summary-note"
        checkoutLabel={f["olive.cart.checkout-label"] ?? ""}
        checkoutLabelFieldKey="olive.cart.checkout-label"
        continueShoppingLabel={f["olive.cart.continue-shopping"] ?? ""}
        continueShoppingFieldKey="olive.cart.continue-shopping"
        emptyHeading={f["olive.cart.empty-heading"] ?? ""}
        emptyBody={f["olive.cart.empty-body"] ?? ""}
        emptyCta={f["olive.cart.empty-cta"] ?? ""}
      />
    </OliveSection>
  );
}
