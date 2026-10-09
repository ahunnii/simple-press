import type { DefaultCartPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";

import { resolveFields } from "..";
import { GloveSection } from "../shared/glove-section";
import { GLOVE_STEP_FIELD_LIST } from "./checkout-fields";
import { GloveCartContents } from "./glove-cart-contents";
import { GloveCheckoutSteps } from "./glove-checkout-steps";

/**
 * Cart page: the shared plum progress band (step 1) over one section holding
 * the line-item list, the "Order summary" card and the empty state. Fields are
 * resolved here; everything that touches the cart itself lives in the client
 * `GloveCartContents`.
 */
export async function GloveCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    ...GLOVE_STEP_FIELD_LIST,
    "glove.cart.column-product",
    "glove.cart.column-price",
    "glove.cart.column-quantity",
    "glove.cart.column-subtotal",
    "glove.cart.continue-label",
    "glove.cart.totals-heading",
    "glove.cart.totals-note",
    "glove.cart.checkout-label",
    "glove.cart.empty-heading",
    "glove.cart.empty-body",
    "glove.cart.empty-cta",
  ]);

  const cartLabel = f["glove.checkout.step-cart"] ?? "";

  return (
    <>
      <GloveCheckoutSteps
        current={1}
        heading={cartLabel}
        labels={{
          cart: cartLabel,
          checkout: f["glove.checkout.step-checkout"] ?? "",
          complete: f["glove.checkout.step-complete"] ?? "",
        }}
      />
      <GloveSection
        sectionAttrs={sectionGroupAttr("cart", "main")}
        aria-label="Your bag"
        reveal={false}
      >
        <GloveCartContents
          shippingConfig={shippingConfigFromBusiness(business)}
          columnProduct={f["glove.cart.column-product"] ?? ""}
          columnPrice={f["glove.cart.column-price"] ?? ""}
          columnQuantity={f["glove.cart.column-quantity"] ?? ""}
          columnSubtotal={f["glove.cart.column-subtotal"] ?? ""}
          continueLabel={f["glove.cart.continue-label"] ?? ""}
          totalsHeading={f["glove.cart.totals-heading"] ?? ""}
          totalsNote={f["glove.cart.totals-note"] ?? ""}
          checkoutLabel={f["glove.cart.checkout-label"] ?? ""}
          emptyHeading={f["glove.cart.empty-heading"] ?? ""}
          emptyBody={f["glove.cart.empty-body"] ?? ""}
          emptyCta={f["glove.cart.empty-cta"] ?? ""}
        />
      </GloveSection>
    </>
  );
}
