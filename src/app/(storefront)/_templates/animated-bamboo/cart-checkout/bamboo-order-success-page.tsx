import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { BambooEdge } from "../shared/bamboo-edge";
import { BambooOrderConfirmation } from "./bamboo-order-confirmation";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

/**
 * The confirmation component owns its own full-bleed sage celebration band
 * (and the paper section under it), so this shell deliberately does NOT wrap
 * it in a max-width container — it only supplies the `<Suspense>` boundary
 * `useSearchParams` requires. The footer edge is added HERE, in both the
 * fallback and the delegate branch, rather than inside
 * bamboo-order-confirmation.tsx — a sibling placed after
 * `<BambooOrderConfirmation>` renders regardless of which of that
 * component's own internal branches (no session, or the full confirmation)
 * is returned, so one edge covers both.
 */
export function BambooOrderSuccessPage({ business }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <section className="mx-auto max-w-2xl px-4 py-24 text-center lg:px-8">
            <p className="text-[var(--bamboo-ink-soft)]">Loading...</p>
          </section>
          <BambooEdge from="paper" to="pine" variant="c" />
        </>
      }
    >
      <BambooOrderConfirmation business={business} />
      <BambooEdge from="paper" to="pine" variant="c" />
    </Suspense>
  );
}
