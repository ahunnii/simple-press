import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { getSession } from "~/server/better-auth/server";

import { resolveFields } from "..";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";
import {
  PollenOrderConfirmation,
  PollenOrderNotFound,
} from "./pollen-order-confirmation";
import { PollenOrderSuccessView } from "./pollen-order-success-view";

/** Blank / whitespace-only Settings strings count as unset. */
function presentOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

/**
 * `/order/success` — pollen-native confirmation (B9). Resolves every string
 * server-side, then lets `PollenOrderSuccessView` pick the confirmed or
 * not-found page on the client (the route gives templates no searchParams).
 * Each state gets its own band title: a visit with no order must never read
 * "Order Confirmed".
 *
 * The band titles live-patch via `titleFieldKey`/`subtitleFieldKey`; the
 * `data-sp-group` hotspot sits on each body section (one per group), not on
 * the band, whose image keeps its own `global.header` hotspot.
 *
 * The shopper's session is read here and seeds `useHydratedSession` below, so
 * the account button (B9.4) is right on first paint.
 */
export async function PollenOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  const session = await getSession().catch(() => null);
  const initialSession = session ?? null;

  const f = resolveFields(business.siteContent?.customFields, [
    "pollen.checkout.confirmation-subtitle",
    "pollen.checkout.confirmation-title",
    "pollen.checkout.confirmation-heading",
    "pollen.checkout.confirmation-intro",
    "pollen.checkout.confirmation-next-heading",
    "pollen.checkout.confirmation-receipt-step",
    "pollen.checkout.confirmation-ship-step",
    "pollen.checkout.confirmation-pickup-step",
    "pollen.checkout.confirmation-general-step",
    "pollen.checkout.confirmation-details-heading",
    "pollen.checkout.confirmation-continue-button",
    "pollen.checkout.confirmation-orders-button",
    "pollen.checkout.confirmation-sign-up-button",
    "pollen.checkout.confirmation-sign-up-text",
    "pollen.checkout.no-order-subtitle",
    "pollen.checkout.no-order-title",
    "pollen.checkout.no-order-body",
  ]);

  const continueLabel = f["pollen.checkout.confirmation-continue-button"] ?? "";
  const ordersLabel = f["pollen.checkout.confirmation-orders-button"] ?? "";

  const confirmed = (
    <PollenGeneralLayout
      business={business}
      title={f["pollen.checkout.confirmation-title"] ?? ""}
      subtitle={f["pollen.checkout.confirmation-subtitle"] ?? ""}
      titleFieldKey="pollen.checkout.confirmation-title"
      subtitleFieldKey="pollen.checkout.confirmation-subtitle"
      showCTA={false}
    >
      <PollenOrderConfirmation
        copy={{
          heading: f["pollen.checkout.confirmation-heading"] ?? "",
          intro: f["pollen.checkout.confirmation-intro"] ?? "",
          nextHeading: f["pollen.checkout.confirmation-next-heading"] ?? "",
          receiptStep: f["pollen.checkout.confirmation-receipt-step"] ?? "",
          shipStep: f["pollen.checkout.confirmation-ship-step"] ?? "",
          pickupStep: f["pollen.checkout.confirmation-pickup-step"] ?? "",
          generalStep: f["pollen.checkout.confirmation-general-step"] ?? "",
          detailsHeading:
            f["pollen.checkout.confirmation-details-heading"] ?? "",
          continueLabel,
          ordersLabel,
          signUpLabel: f["pollen.checkout.confirmation-sign-up-button"] ?? "",
          signUpText: f["pollen.checkout.confirmation-sign-up-text"] ?? "",
        }}
        pickupLocation={
          presentOrNull(business.pickupLocation) ??
          presentOrNull(business.businessAddress)
        }
        pickupInstructions={presentOrNull(business.pickupInstructions)}
        initialSession={initialSession}
      />
    </PollenGeneralLayout>
  );

  const notFound = (
    <PollenGeneralLayout
      business={business}
      title={f["pollen.checkout.no-order-title"] ?? ""}
      subtitle={f["pollen.checkout.no-order-subtitle"] ?? ""}
      titleFieldKey="pollen.checkout.no-order-title"
      subtitleFieldKey="pollen.checkout.no-order-subtitle"
      showCTA={false}
    >
      <PollenOrderNotFound
        copy={{
          body: f["pollen.checkout.no-order-body"] ?? "",
          continueLabel,
          ordersLabel,
        }}
        initialSession={initialSession}
      />
    </PollenGeneralLayout>
  );

  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-[60vh] items-center justify-center px-4 pt-24 text-[#4c566a]"
        >
          Loading your order…
        </div>
      }
    >
      <PollenOrderSuccessView confirmed={confirmed} notFound={notFound} />
    </Suspense>
  );
}
