import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { getSession } from "~/server/better-auth/server";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { OliveLeafMark, OliveSection } from "../shared";
import { OliveOrderConfirmation } from "./olive-order-confirmation";

// No shared interface for this slot — `order/success/page.tsx` passes only
// the business, so the shape is declared locally (same as vii and pink).
type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

/**
 * The shell React shows while the client half suspends on `useSearchParams`.
 * Same composition as the confirmation's own confirming state, so the
 * hand-off between them is invisible.
 */
function OliveOrderLoading({ loadingText }: { loadingText: string }) {
  return (
    <OliveSection
      bleed
      tone="paper"
      {...sectionGroupAttr("checkout", "success")}
    >
      <div className="mx-auto flex w-full max-w-[36rem] flex-col items-center gap-4 text-center">
        <span
          className="flex animate-pulse items-center motion-reduce:animate-none"
          style={{ color: "var(--olive-leaf)" }}
        >
          <OliveLeafMark size={24} />
        </span>
        <p role="status" aria-live="polite" className="olive-h3">
          {loadingText}
        </p>
      </div>
    </OliveSection>
  );
}

/**
 * Order success — design.md → "checkout.success". Resolves the owner's copy
 * server-side and hands it to the client component, which needs the query
 * string and therefore has to sit inside a `<Suspense>` boundary.
 */
export async function OliveOrderSuccessPage({ business }: Props) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.checkout.success-heading",
    "olive.checkout.success-body",
    "olive.checkout.success-next-heading",
    "olive.checkout.success-next-steps",
    "olive.checkout.success-next-steps-pickup",
    "olive.checkout.success-continue-label",
    "olive.checkout.success-loading",
    "olive.checkout.success-no-order-heading",
    "olive.checkout.success-no-order-body",
  ]);

  const loadingText = f["olive.checkout.success-loading"] ?? "";

  // PF18 / B9.4 — resolved server-side so the account CTA is correct on the
  // first paint; see the doc on `OliveOrderConfirmation`'s `initialSession`
  // prop.
  const initialSession = await getSession().catch(() => null);

  return (
    <Suspense fallback={<OliveOrderLoading loadingText={loadingText} />}>
      <OliveOrderConfirmation
        business={{
          pickupLocation: business.pickupLocation,
          pickupInstructions: business.pickupInstructions,
        }}
        heading={f["olive.checkout.success-heading"] ?? ""}
        body={f["olive.checkout.success-body"] ?? ""}
        nextHeading={f["olive.checkout.success-next-heading"] ?? ""}
        nextSteps={f["olive.checkout.success-next-steps"] ?? ""}
        nextStepsPickup={f["olive.checkout.success-next-steps-pickup"] ?? ""}
        continueLabel={f["olive.checkout.success-continue-label"] ?? ""}
        loadingText={loadingText}
        noOrderHeading={f["olive.checkout.success-no-order-heading"] ?? ""}
        noOrderBody={f["olive.checkout.success-no-order-body"] ?? ""}
        initialSession={initialSession}
      />
    </Suspense>
  );
}
