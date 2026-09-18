import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { resolveFields } from "..";
import { UmscOrderConfirmation } from "./umsc-order-confirmation";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

function UmscOrderLoadingFallback({ loadingText }: { loadingText: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[var(--umsc-paper)] px-6 py-24 sm:px-8">
      <p
        role="status"
        aria-live="polite"
        className="umsc-serif text-[clamp(18px,2vw,24px)] font-normal text-[var(--umsc-muted)]"
      >
        {loadingText || "Confirming your order…"}
      </p>
    </div>
  );
}

/**
 * UmscOrderSuccessPage — no shared `types.ts` interface (locally typed, same
 * as every other template's OrderSuccessPage). Server component resolves the
 * `order.main` fields, then hands off to the client `UmscOrderConfirmation`
 * (needs `useSearchParams`/`useCart`), wrapped in `<Suspense>`.
 */
export function UmscOrderSuccessPage({ business }: Props) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "umsc.order.thank-you-heading",
    "umsc.order.next-steps",
    "umsc.order.continue-cta",
    "umsc.order.loading-text",
    "umsc.order.no-order-heading",
    "umsc.order.no-order-body",
  ]);

  const loadingText = f["umsc.order.loading-text"] ?? "Confirming your order…";

  return (
    <Suspense fallback={<UmscOrderLoadingFallback loadingText={loadingText} />}>
      <UmscOrderConfirmation
        businessName={business.name}
        thankYouHeading={f["umsc.order.thank-you-heading"] ?? ""}
        nextSteps={f["umsc.order.next-steps"] ?? ""}
        continueCta={f["umsc.order.continue-cta"] ?? ""}
        loadingText={loadingText}
        noOrderHeading={f["umsc.order.no-order-heading"] ?? ""}
        noOrderBody={f["umsc.order.no-order-body"] ?? ""}
      />
    </Suspense>
  );
}
