import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";

import { resolveFields } from "..";
import { BAMBOO_EMBLEM_CLEAR } from "../shared/bamboo-emblem-clearance";
import { BambooOrderConfirmation } from "./bamboo-order-confirmation";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

export function BambooOrderSuccessPage({ business }: Props) {
  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.checkout.success-note",
  ]);
  const note = f["bamboo.checkout.success-note"] ?? "";

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
        <BambooOrderConfirmation business={business} note={note} />
      </Suspense>
    </section>
  );
}
