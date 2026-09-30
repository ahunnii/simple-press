import Link from "next/link";

import type { DefaultCartPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import {
  CART_EMPTY_HEADING_DEFAULT,
  CART_SUMMARY_CHECKOUT_BUTTON_DEFAULT,
  CART_SUMMARY_HEADING_DEFAULT,
} from "./cart-fields";
import { DefaultCartContents } from "./default-cart-contents";

export async function DefaultCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "default.cart.empty-heading",
    "default.cart.empty-body",
    "default.cart.empty-button",
    "default.cart.summary-heading",
    "default.cart.summary-checkout-button",
  ]);
  const emptyHeading =
    (f["default.cart.empty-heading"] ?? "").trim() ||
    CART_EMPTY_HEADING_DEFAULT;
  // Both fields hide their element when blank — resolve the trimmed value
  // as-is (no CONSTANT fallback) so an owner can actually clear them.
  const emptyBody = (f["default.cart.empty-body"] ?? "").trim();
  const emptyButton = (f["default.cart.empty-button"] ?? "").trim();
  const summaryHeading =
    (f["default.cart.summary-heading"] ?? "").trim() ||
    CART_SUMMARY_HEADING_DEFAULT;
  const summaryCheckoutButton =
    (f["default.cart.summary-checkout-button"] ?? "").trim() ||
    CART_SUMMARY_CHECKOUT_BUTTON_DEFAULT;

  return (
    <div>
      {/* Page hero */}
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
          >
            <Link href="/" className="transition-colors hover:text-[#0a0a0a]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Cart</span>
          </nav>
          <h1 className="font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]">
            Your cart
          </h1>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <DefaultCartContents
            business={business}
            emptyHeading={emptyHeading}
            emptyBody={emptyBody}
            emptyButton={emptyButton}
            summaryHeading={summaryHeading}
            summaryCheckoutButton={summaryCheckoutButton}
          />
        </div>
      </section>
    </div>
  );
}
