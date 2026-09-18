import type { DefaultCartPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { UmscBreadcrumb } from "../shared/umsc-breadcrumb";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscCartContents } from "./umsc-cart-contents";

/**
 * UmscCartPage — Operate mode: no scroll reveals, scanability first. A slim
 * cream band (breadcrumb + heading, no black hero — that's reserved for
 * marketing pages) sits directly under the sticky header, then the cart
 * contents (client component, `useCart`).
 */
export async function UmscCartPage({ business }: DefaultCartPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "umsc.cart.heading",
    "umsc.cart.empty-heading",
    "umsc.cart.empty-body",
    "umsc.cart.continue-shopping",
    "umsc.cart.checkout-cta",
  ]);

  const doorRows = parseTemplateListRows(
    customFields?.["umsc.cart.empty-doors"],
  );

  return (
    <div className="bg-[var(--umsc-paper)]">
      <div className="border-b border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-6 py-10 sm:px-8">
        <div className="mx-auto" style={{ maxWidth: "var(--umsc-container)" }}>
          <UmscBreadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Cart" }]}
          />
          <UmscHeading
            as="h1"
            fieldKey="umsc.cart.heading"
            className="mt-4 !text-[clamp(32px,4.4vw,48px)]"
          >
            {f["umsc.cart.heading"] ?? ""}
          </UmscHeading>
        </div>
      </div>

      <div
        className="px-6 py-12 sm:px-8 sm:py-16"
        {...sectionGroupAttr("cart", "main")}
      >
        <div className="mx-auto" style={{ maxWidth: "var(--umsc-container)" }}>
          <UmscCartContents
            emptyHeading={f["umsc.cart.empty-heading"] ?? ""}
            emptyBody={f["umsc.cart.empty-body"] ?? ""}
            continueShoppingLabel={f["umsc.cart.continue-shopping"] ?? ""}
            checkoutCta={f["umsc.cart.checkout-cta"] ?? ""}
            doorRows={doorRows}
          />
        </div>
      </div>
    </div>
  );
}
