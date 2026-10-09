import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { getSession } from "~/server/better-auth/server";

import { resolveFields } from "..";
import { GLOVE_STEP_FIELD_LIST } from "./checkout-fields";
import { GloveCheckoutSteps } from "./glove-checkout-steps";
import { GloveOrderConfirmation } from "./glove-order-confirmation";

// No shared interface for this slot: `order/success/page.tsx` passes only the
// business, so the shape is declared locally.
type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

/**
 * Order confirmation page: progress band (step 3) over the confirmation.
 * Resolves the owner's copy and the session server-side (so the account next
 * step is right on first paint) and hands both to the client component,
 * which needs the query string and so sits inside a `<Suspense>` boundary.
 */
export async function GloveOrderSuccessPage({ business }: Props) {
  const f = resolveFields(business.siteContent?.customFields, [
    ...GLOVE_STEP_FIELD_LIST,
    "glove.checkout.confirmation-heading",
    "glove.checkout.confirmation-body",
    "glove.checkout.confirmation-items-heading",
    "glove.checkout.confirmation-next-heading",
    "glove.checkout.confirmation-next-steps",
    "glove.checkout.confirmation-next-steps-pickup",
    "glove.checkout.confirmation-track-label",
    "glove.checkout.confirmation-continue-label",
    "glove.checkout.confirmation-loading",
    "glove.checkout.confirmation-no-order-heading",
    "glove.checkout.confirmation-no-order-body",
  ]);

  const loadingText = f["glove.checkout.confirmation-loading"] ?? "";
  const initialSession = await getSession().catch(() => null);

  return (
    <>
      <GloveCheckoutSteps
        current={3}
        labels={{
          cart: f["glove.checkout.step-cart"] ?? "",
          checkout: f["glove.checkout.step-checkout"] ?? "",
          complete: f["glove.checkout.step-complete"] ?? "",
        }}
      />
      <Suspense
        fallback={
          <p
            role="status"
            aria-live="polite"
            className="glove-display py-24 text-center text-[18px] font-medium text-[var(--glove-ink)]"
          >
            {loadingText}
          </p>
        }
      >
        <GloveOrderConfirmation
          business={{
            pickupLocation: business.pickupLocation,
            pickupInstructions: business.pickupInstructions,
          }}
          heading={f["glove.checkout.confirmation-heading"] ?? ""}
          body={f["glove.checkout.confirmation-body"] ?? ""}
          itemsHeading={f["glove.checkout.confirmation-items-heading"] ?? ""}
          nextHeading={f["glove.checkout.confirmation-next-heading"] ?? ""}
          nextSteps={f["glove.checkout.confirmation-next-steps"] ?? ""}
          nextStepsPickup={
            f["glove.checkout.confirmation-next-steps-pickup"] ?? ""
          }
          trackLabel={f["glove.checkout.confirmation-track-label"] ?? ""}
          continueLabel={f["glove.checkout.confirmation-continue-label"] ?? ""}
          loadingText={loadingText}
          noOrderHeading={
            f["glove.checkout.confirmation-no-order-heading"] ?? ""
          }
          noOrderBody={f["glove.checkout.confirmation-no-order-body"] ?? ""}
          initialSession={initialSession}
        />
      </Suspense>
    </>
  );
}
