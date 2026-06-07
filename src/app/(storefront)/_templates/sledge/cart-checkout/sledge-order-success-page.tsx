import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { PageTransition } from "~/components/page-animations";

import { SledgeOrderConfirmation } from "./sledge-order-confirmation";

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
            <p
              className="font-sans text-sm tracking-[0.12em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              Confirming your order…
            </p>
          </div>
        }
      >
        <SledgeOrderConfirmation business={business} />
      </Suspense>
    </PageTransition>
  );
}
