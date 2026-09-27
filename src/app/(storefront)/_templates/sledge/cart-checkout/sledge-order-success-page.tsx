import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { PageTransition } from "~/components/page-animations";

import {
  SLEDGE_CONFIRMATION_NOTES_DEFAULTS,
  SLEDGE_CONFIRMATION_NOTES_KEY,
} from "./cart-fields";
import { SledgeOrderConfirmation } from "./sledge-order-confirmation";
import { resolveSledgeTextList } from "./text-list";

export function SledgeOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <PageTransition className="bg-white">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center bg-white">
            <p className="sl-eyebrow font-sans text-sm tracking-[0.12em] uppercase">
              Confirming your order…
            </p>
          </div>
        }
      >
        <SledgeOrderConfirmation
          business={business}
          notes={resolveSledgeTextList(
            business.siteContent?.customFields,
            SLEDGE_CONFIRMATION_NOTES_KEY,
            SLEDGE_CONFIRMATION_NOTES_DEFAULTS,
          )}
        />
      </Suspense>
    </PageTransition>
  );
}
