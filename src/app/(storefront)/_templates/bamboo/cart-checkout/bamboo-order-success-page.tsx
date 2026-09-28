import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { getSession } from "~/server/better-auth/server";
import { cn } from "~/lib/utils";

import { resolveFields } from "..";
import { BAMBOO_EMBLEM_CLEAR } from "../shared/bamboo-emblem-clearance";
import { BambooOrderConfirmation } from "./bamboo-order-confirmation";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

export async function BambooOrderSuccessPage({ business }: Props) {
  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.checkout.success-note",
  ]);
  const note = f["bamboo.checkout.success-note"] ?? "";

  // Resolved server-side so the account CTA (B9.4 / PF25) is right on the
  // first paint — see the doc on `BambooOrderConfirmation`'s `initialSession`
  // prop.
  const initialSession = await getSession().catch(() => null);

  return (
    <section
      className={cn("mx-auto max-w-7xl px-4 py-16 lg:px-8", BAMBOO_EMBLEM_CLEAR)}
    >
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <BambooOrderConfirmation
          business={business}
          note={note}
          initialSession={initialSession}
        />
      </Suspense>
    </section>
  );
}
