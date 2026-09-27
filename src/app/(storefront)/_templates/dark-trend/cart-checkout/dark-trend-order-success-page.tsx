import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { resolveFields } from "..";
import { DarkTrendOrderConfirmation } from "./dark-trend-order-confirmation";
import {
  DARK_TREND_CONFIRMATION_STEPS_DEFAULTS,
  DARK_TREND_CONFIRMATION_STEPS_KEY,
} from "./order-fields";
import { resolveDarkTrendTextList } from "./text-list";

export function DarkTrendOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "dark-trend.checkout.confirmation-heading",
    "dark-trend.checkout.confirmation-next-heading",
    "dark-trend.checkout.confirmation-continue-button",
  ]);

  const steps = resolveDarkTrendTextList(
    customFields,
    DARK_TREND_CONFIRMATION_STEPS_KEY,
    DARK_TREND_CONFIRMATION_STEPS_DEFAULTS,
  );

  return (
    <div className="flex min-h-[75vh] flex-1 items-center justify-center bg-[#1A1A1A] px-4 py-12">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-white/70">Loading...</p>
          </div>
        }
      >
        <DarkTrendOrderConfirmation
          business={business}
          heading={f["dark-trend.checkout.confirmation-heading"] ?? ""}
          nextHeading={
            f["dark-trend.checkout.confirmation-next-heading"] ?? ""
          }
          continueLabel={
            f["dark-trend.checkout.confirmation-continue-button"] ?? ""
          }
          steps={steps}
        />
      </Suspense>
    </div>
  );
}
