import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { PageTransition } from "~/components/page-animations";

import { NoiseOrderConfirmation } from "./noise-order-confirmation";

export function NoiseOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <PageTransition>
      <Suspense
        fallback={
          <div
            className="flex min-h-[40vh] items-center justify-center"
            style={{ background: "var(--vn-paper)" }}
          >
            <p
              className="font-mono text-[10px] tracking-[0.22em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Confirming your transmission…
            </p>
          </div>
        }
      >
        <NoiseOrderConfirmation business={business} />
      </Suspense>
    </PageTransition>
  );
}
