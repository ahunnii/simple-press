import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { getSession } from "~/server/better-auth/server";

import { resolveFields } from "..";
import { resolveUmscContactDetails } from "../shared/umsc-contact-details";
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
 * `checkout.success` fields, the customer-service phone from Settings (PF18,
 * `resolveUmscContactDetails` — never a duplicated field), and the session
 * (PF17, seeds the account-CTA hook so it's right on first paint), then
 * hands off to the client `UmscOrderConfirmation` (needs
 * `useSearchParams`/`useCart`), wrapped in `<Suspense>`.
 */
export async function UmscOrderSuccessPage({ business }: Props) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "umsc.order.thank-you-heading",
    "umsc.order.next-steps-heading",
    "umsc.order.next-steps",
    "umsc.order.next-steps-pickup",
    "umsc.order.continue-cta",
    "umsc.order.home-link-label",
    "umsc.order.loading-text",
    "umsc.order.no-order-heading",
    "umsc.order.no-order-body",
  ]);

  const loadingText = f["umsc.order.loading-text"] ?? "Confirming your order…";
  const { phone } = resolveUmscContactDetails(business);

  // PF17 / B9.4 — resolved server-side so the account CTA is correct on the
  // first paint; see the doc on `UmscOrderConfirmation`'s `initialSession`
  // prop.
  const initialSession = await getSession().catch(() => null);

  return (
    <Suspense fallback={<UmscOrderLoadingFallback loadingText={loadingText} />}>
      <UmscOrderConfirmation
        businessName={business.name}
        thankYouHeading={f["umsc.order.thank-you-heading"] ?? ""}
        nextStepsHeading={f["umsc.order.next-steps-heading"] ?? ""}
        nextSteps={f["umsc.order.next-steps"] ?? ""}
        nextStepsPickup={f["umsc.order.next-steps-pickup"] ?? ""}
        phone={phone}
        continueCta={f["umsc.order.continue-cta"] ?? ""}
        homeLinkLabel={f["umsc.order.home-link-label"] ?? ""}
        loadingText={loadingText}
        noOrderHeading={f["umsc.order.no-order-heading"] ?? ""}
        noOrderBody={f["umsc.order.no-order-body"] ?? ""}
        initialSession={initialSession}
      />
    </Suspense>
  );
}
