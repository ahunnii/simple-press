import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { getSession } from "~/server/better-auth/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { NoiseOrderConfirmation } from "./noise-order-confirmation";

export async function NoiseOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  const f = resolveFields(business.siteContent?.customFields, [
    "noise.checkout.success-note",
  ]);

  // PF20 / B9.4 — resolved server-side so the account CTA is correct on the
  // first paint; see the doc on `NoiseOrderConfirmation`'s `initialSession`
  // prop.
  const initialSession = await getSession().catch(() => null);

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
        <NoiseOrderConfirmation
          business={business}
          note={f["noise.checkout.success-note"] ?? ""}
          initialSession={initialSession}
        />
      </Suspense>
    </PageTransition>
  );
}
