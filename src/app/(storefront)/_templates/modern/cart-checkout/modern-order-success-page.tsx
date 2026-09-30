import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { DefaultOrderConfirmation } from "../../default/cart-checkout/default-order-confirmation";

export function ModernOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  const f = resolveFields(business.siteContent?.customFields, [
    "modern.checkout.success-note",
  ]);
  const note = (f["modern.checkout.success-note"] ?? "").trim();

  return (
    <div
      className="flex-1 px-4 py-12"
      {...sectionGroupAttr("checkout", "success")}
    >
      <Suspense
        fallback={
          <div role="status" className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground">Loading your order details…</p>
          </div>
        }
      >
        <DefaultOrderConfirmation business={business} />
      </Suspense>
      {/* `DefaultOrderConfirmation` takes no note prop, so the owner's note
          sits in its own block beneath it, on the same column width. */}
      {note ? (
        <div className="border-border mx-auto mt-8 max-w-2xl border-t pt-6">
          <p
            {...fieldAttr("modern.checkout.success-note")}
            className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line"
          >
            {note}
          </p>
        </div>
      ) : null}
    </div>
  );
}
