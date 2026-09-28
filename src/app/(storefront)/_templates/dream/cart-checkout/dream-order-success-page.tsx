import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { getSession } from "~/server/better-auth/server";

import { DreamOrderConfirmation } from "./dream-order-confirmation";
import { resolveDreamOrderSteps } from "./dream-order-steps";
import {
  resolveDreamCartCheckoutFields,
  resolveDreamCartCheckoutRequired,
} from "./index";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

const FALLBACK_LOGO = "/templates/dream/images/logo.webp";

/**
 * `/order/success` — resolves the owner's confirmation copy, the three
 * next-step lists, the logo, and the session server-side, then hands off
 * to the client `DreamOrderConfirmation` (which needs `useSearchParams`
 * for the Stripe `session_id`, hence the Suspense boundary).
 */
export async function DreamOrderSuccessPage({ business }: Props) {
  const customFields = business.siteContent?.customFields;
  const req = resolveDreamCartCheckoutRequired(customFields, [
    "dream.checkout.confirmation-heading",
    "dream.checkout.confirmation-next-heading",
    "dream.checkout.confirmation-receipt-heading",
    "dream.checkout.confirmation-orders-label",
    "dream.checkout.confirmation-signup-label",
    "dream.checkout.no-order-heading",
  ]);
  const opt = resolveDreamCartCheckoutFields(customFields, [
    "dream.checkout.confirmation-accent",
    "dream.checkout.confirmation-lede",
    "dream.checkout.confirmation-continue-label",
    "dream.checkout.confirmation-home-label",
    "dream.checkout.no-order-accent",
    "dream.checkout.no-order-lede",
  ]);

  const logoUrl = business.siteContent?.logoUrl ?? FALLBACK_LOGO;
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  // Seeds the account button so it's right on first paint (B9.4).
  const initialSession = await getSession().catch(() => null);

  return (
    <Suspense fallback={<div aria-busy="true" className="min-h-[60vh]" />}>
      <DreamOrderConfirmation
        business={{
          name: business.name,
          pickupLocation: business.pickupLocation,
          pickupInstructions: business.pickupInstructions,
          businessAddress: business.businessAddress,
        }}
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        initialSession={initialSession}
        steps={resolveDreamOrderSteps(customFields)}
        copy={{
          heading: req["dream.checkout.confirmation-heading"] ?? "",
          accent: opt["dream.checkout.confirmation-accent"] ?? "",
          lede: opt["dream.checkout.confirmation-lede"] ?? "",
          nextHeading: req["dream.checkout.confirmation-next-heading"] ?? "",
          receiptHeading:
            req["dream.checkout.confirmation-receipt-heading"] ?? "",
          ordersLabel: req["dream.checkout.confirmation-orders-label"] ?? "",
          signupLabel: req["dream.checkout.confirmation-signup-label"] ?? "",
          continueLabel:
            opt["dream.checkout.confirmation-continue-label"] ?? "",
          homeLabel: opt["dream.checkout.confirmation-home-label"] ?? "",
          noOrderHeading: req["dream.checkout.no-order-heading"] ?? "",
          noOrderAccent: opt["dream.checkout.no-order-accent"] ?? "",
          noOrderLede: opt["dream.checkout.no-order-lede"] ?? "",
        }}
      />
    </Suspense>
  );
}
